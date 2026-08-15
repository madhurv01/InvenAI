using InventoryApi.Data;
using InventoryApi.DTOs;
using InventoryApi.Middleware;
using InventoryApi.Models;
using InventoryApi.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InventoryApi.Services;

public class InventoryService : IInventoryService
{
    private readonly InventoryDbContext _db;

    public InventoryService(InventoryDbContext db)
    {
        _db = db;
    }

    public async Task<List<InventoryItemDto>> GetStockAsync(Guid? productId, Guid? warehouseId, bool? lowStockOnly)
    {
        var query = _db.Inventory
            .AsNoTracking()
            .Include(i => i.Product)
            .Include(i => i.Warehouse)
            .AsQueryable();

        if (productId.HasValue) query = query.Where(i => i.ProductId == productId);
        if (warehouseId.HasValue) query = query.Where(i => i.WarehouseId == warehouseId);

        var records = await query.OrderBy(i => i.Product!.Name).ToListAsync();

        var result = records.Select(MapToDto).ToList();

        if (lowStockOnly == true)
            result = result.Where(r => r.IsLowStock).ToList();

        return result;
    }

    public async Task<StockMovementDto> RecordMovementAsync(CreateStockMovementDto dto)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == dto.ProductId)
            ?? throw new NotFoundException($"Product with id '{dto.ProductId}' was not found.");

        var warehouse = await _db.Warehouses.FirstOrDefaultAsync(w => w.Id == dto.WarehouseId)
            ?? throw new NotFoundException($"Warehouse with id '{dto.WarehouseId}' was not found.");

        var inventory = await _db.Inventory
            .FirstOrDefaultAsync(i => i.ProductId == dto.ProductId && i.WarehouseId == dto.WarehouseId);

        if (inventory == null)
        {
            inventory = new Inventory
            {
                Id = Guid.NewGuid(),
                ProductId = dto.ProductId,
                WarehouseId = dto.WarehouseId,
                QuantityOnHand = 0,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Inventory.Add(inventory);
        }

        switch (dto.MovementType)
        {
            case "IN":
                inventory.QuantityOnHand += dto.Quantity;
                break;
            case "OUT":
                if (inventory.QuantityOnHand < dto.Quantity)
                    throw new BadRequestException($"Insufficient stock. Available: {inventory.QuantityOnHand}, requested: {dto.Quantity}.");
                inventory.QuantityOnHand -= dto.Quantity;
                break;
            case "ADJUSTMENT":
                // For adjustments, "Quantity" represents the new absolute quantity on hand.
                inventory.QuantityOnHand = dto.Quantity;
                break;
            default:
                throw new BadRequestException("Movement type must be IN, OUT or ADJUSTMENT.");
        }

        inventory.UpdatedAt = DateTime.UtcNow;

        var movement = new StockMovement
        {
            Id = Guid.NewGuid(),
            ProductId = dto.ProductId,
            WarehouseId = dto.WarehouseId,
            MovementType = dto.MovementType,
            Quantity = dto.Quantity,
            Reason = dto.Reason,
            ReferenceNo = dto.ReferenceNo,
            PerformedBy = dto.PerformedBy ?? "system",
            CreatedAt = DateTime.UtcNow
        };

        _db.StockMovements.Add(movement);
        await _db.SaveChangesAsync();

        return new StockMovementDto
        {
            Id = movement.Id,
            ProductId = product.Id,
            ProductName = product.Name,
            Sku = product.Sku,
            WarehouseId = warehouse.Id,
            WarehouseName = warehouse.Name,
            MovementType = movement.MovementType,
            Quantity = movement.Quantity,
            Reason = movement.Reason,
            ReferenceNo = movement.ReferenceNo,
            PerformedBy = movement.PerformedBy,
            CreatedAt = movement.CreatedAt
        };
    }

    public async Task<List<StockMovementDto>> GetMovementHistoryAsync(Guid? productId, Guid? warehouseId, int take)
    {
        var query = _db.StockMovements
            .AsNoTracking()
            .Include(m => m.Product)
            .Include(m => m.Warehouse)
            .AsQueryable();

        if (productId.HasValue) query = query.Where(m => m.ProductId == productId);
        if (warehouseId.HasValue) query = query.Where(m => m.WarehouseId == warehouseId);

        var movements = await query
            .OrderByDescending(m => m.CreatedAt)
            .Take(take <= 0 ? 50 : take)
            .ToListAsync();

        return movements.Select(m => new StockMovementDto
        {
            Id = m.Id,
            ProductId = m.ProductId,
            ProductName = m.Product?.Name ?? string.Empty,
            Sku = m.Product?.Sku ?? string.Empty,
            WarehouseId = m.WarehouseId,
            WarehouseName = m.Warehouse?.Name ?? string.Empty,
            MovementType = m.MovementType,
            Quantity = m.Quantity,
            Reason = m.Reason,
            ReferenceNo = m.ReferenceNo,
            PerformedBy = m.PerformedBy,
            CreatedAt = m.CreatedAt
        }).ToList();
    }

    public async Task<List<WarehouseDto>> GetWarehousesAsync()
    {
        return await _db.Warehouses
            .AsNoTracking()
            .Where(w => w.IsActive)
            .OrderBy(w => w.Name)
            .Select(w => new WarehouseDto { Id = w.Id, Name = w.Name, Location = w.Location })
            .ToListAsync();
    }

    // -------- Controlled functions used by the AI Assistant (no arbitrary SQL) --------

    public async Task<List<InventoryItemDto>> GetLowStockProductsAsync()
    {
        var all = await GetStockAsync(null, null, null);
        return all.Where(i => i.IsLowStock).OrderBy(i => i.QuantityOnHand).ToList();
    }

    public async Task<DashboardSummaryDto> GetInventorySummaryAsync()
    {
        // Lightweight projection (no full entity/navigation materialization) — stock totals summed on the DB side.
        var productAgg = await _db.Products
            .AsNoTracking()
            .Select(p => new
            {
                p.UnitPrice,
                CategoryName = p.Category != null ? p.Category.Name : "Uncategorized",
                TotalStock = p.InventoryRecords.Sum(i => (int?)i.QuantityOnHand) ?? 0
            })
            .ToListAsync();

        var lowStock = await GetLowStockProductsAsync();
        var recentMovements = await GetRecentStockMovementsAsync(10);

        var categoryBreakdown = productAgg
            .GroupBy(p => p.CategoryName)
            .Select(g => new CategoryBreakdownDto
            {
                CategoryName = g.Key,
                ProductCount = g.Count(),
                InventoryValue = g.Sum(p => p.UnitPrice * p.TotalStock)
            })
            .OrderByDescending(c => c.InventoryValue)
            .ToList();

        return new DashboardSummaryDto
        {
            TotalProducts = productAgg.Count,
            TotalInventoryValue = productAgg.Sum(p => p.UnitPrice * p.TotalStock),
            LowStockCount = lowStock.Count,
            TotalStockUnits = productAgg.Sum(p => p.TotalStock),
            LowStockProducts = lowStock,
            RecentMovements = recentMovements,
            CategoryBreakdown = categoryBreakdown
        };
    }

    public async Task<List<StockMovementDto>> GetRecentStockMovementsAsync(int take)
    {
        return await GetMovementHistoryAsync(null, null, take);
    }

    private static InventoryItemDto MapToDto(Inventory i) => new()
    {
        ProductId = i.ProductId,
        ProductName = i.Product?.Name ?? string.Empty,
        Sku = i.Product?.Sku ?? string.Empty,
        WarehouseId = i.WarehouseId,
        WarehouseName = i.Warehouse?.Name ?? string.Empty,
        QuantityOnHand = i.QuantityOnHand,
        MinimumStockLevel = i.Product?.MinimumStockLevel ?? 0,
        IsLowStock = i.QuantityOnHand <= (i.Product?.MinimumStockLevel ?? 0),
        UpdatedAt = i.UpdatedAt
    };
}
