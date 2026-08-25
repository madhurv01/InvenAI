using InventoryApi.Data;
using InventoryApi.DTOs;
using InventoryApi.Middleware;
using InventoryApi.Models;
using InventoryApi.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InventoryApi.Services;

/// <summary>
/// Package Order chain: pick a warehouse + products (each optionally "tallied" with a free-text
/// customization note) -> stock is validated and immediately deducted (a stock_movements OUT
/// entry per line, same mechanism as manual inventory movements) -> the order sits Pending until
/// it's linked to a shipment on the New Shipment page, at which point ShipmentService marks it
/// Shipped. A Pending order can also be cancelled, which restocks everything it reserved.
/// </summary>
public class PackageOrderService : IPackageOrderService
{
    private readonly InventoryDbContext _db;

    public PackageOrderService(InventoryDbContext db)
    {
        _db = db;
    }

    public async Task<PackageOrderDetailDto> CreateAsync(CreatePackageOrderDto dto, Guid? userId)
    {
        if (dto.Priority is not ("Low" or "Normal" or "High"))
            throw new BadRequestException("Priority must be Low, Normal or High.");

        var warehouse = await _db.Warehouses.FirstOrDefaultAsync(w => w.Id == dto.WarehouseId)
            ?? throw new NotFoundException("Warehouse not found.");

        // Aggregate requested quantity per product first, so two lines for the same product
        // (e.g. two different customizations) are validated against the same stock together.
        var requestedByProduct = dto.Items
            .GroupBy(i => i.ProductId)
            .ToDictionary(g => g.Key, g => g.Sum(i => i.Quantity));

        var productIds = requestedByProduct.Keys.ToList();
        var products = await _db.Products.Where(p => productIds.Contains(p.Id)).ToListAsync();
        var missing = productIds.Except(products.Select(p => p.Id)).ToList();
        if (missing.Count > 0)
            throw new NotFoundException($"Product(s) not found: {string.Join(", ", missing)}");

        var inventories = await _db.Inventory
            .Where(i => i.WarehouseId == dto.WarehouseId && productIds.Contains(i.ProductId))
            .ToListAsync();
        var inventoryByProduct = inventories.ToDictionary(i => i.ProductId);

        var shortages = new List<string>();
        foreach (var (productId, requested) in requestedByProduct)
        {
            var available = inventoryByProduct.TryGetValue(productId, out var inv) ? inv.QuantityOnHand : 0;
            if (available < requested)
            {
                var name = products.First(p => p.Id == productId).Name;
                shortages.Add($"{name} (requested {requested}, available {available})");
            }
        }

        if (shortages.Count > 0)
            throw new BadRequestException($"Insufficient stock at {warehouse.Name} for: {string.Join("; ", shortages)}.");

        var now = DateTime.UtcNow;
        var order = new PackageOrder
        {
            Id = Guid.NewGuid(),
            OrderNumber = GenerateOrderNumber(),
            WarehouseId = dto.WarehouseId,
            Status = "Pending",
            Priority = dto.Priority,
            Notes = dto.Notes,
            ExpectedShipDate = dto.ExpectedShipDate,
            CreatedBy = userId,
            CreatedAt = now
        };
        _db.PackageOrders.Add(order);

        foreach (var item in dto.Items)
        {
            _db.PackageOrderItems.Add(new PackageOrderItem
            {
                Id = Guid.NewGuid(),
                PackageOrderId = order.Id,
                ProductId = item.ProductId,
                Quantity = item.Quantity,
                CustomizationNote = item.CustomizationNote
            });
        }

        // Deduct stock once per product (the aggregated requested amount) and log one movement per line item.
        foreach (var (productId, requested) in requestedByProduct)
        {
            inventoryByProduct[productId].QuantityOnHand -= requested;
            inventoryByProduct[productId].UpdatedAt = now;
        }

        foreach (var item in dto.Items)
        {
            _db.StockMovements.Add(new StockMovement
            {
                Id = Guid.NewGuid(),
                ProductId = item.ProductId,
                WarehouseId = dto.WarehouseId,
                MovementType = "OUT",
                Quantity = item.Quantity,
                Reason = string.IsNullOrWhiteSpace(item.CustomizationNote)
                    ? $"Package order {order.OrderNumber}"
                    : $"Package order {order.OrderNumber} — {item.CustomizationNote}",
                ReferenceNo = order.OrderNumber,
                PerformedBy = "system",
                CreatedAt = now
            });
        }

        await _db.SaveChangesAsync();

        return await GetByIdAsync(order.Id);
    }

    public async Task<List<PackageOrderSummaryDto>> GetAllAsync()
    {
        return await _db.PackageOrders
            .AsNoTracking()
            .Include(o => o.Warehouse)
            .Include(o => o.Items)
            .Include(o => o.Shipment)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new PackageOrderSummaryDto
            {
                Id = o.Id,
                OrderNumber = o.OrderNumber,
                WarehouseName = o.Warehouse!.Name,
                Status = o.Status,
                Priority = o.Priority,
                ItemCount = o.Items.Count,
                TotalQuantity = o.Items.Sum(i => i.Quantity),
                ExpectedShipDate = o.ExpectedShipDate,
                ShipmentOrderNumber = o.Shipment != null ? o.Shipment.OrderNumber : null,
                CreatedAt = o.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<List<PackageOrderPendingDto>> GetPendingAsync()
    {
        return await _db.PackageOrders
            .AsNoTracking()
            .Include(o => o.Warehouse)
            .Include(o => o.Items)
            .Where(o => o.Status == "Pending")
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new PackageOrderPendingDto
            {
                Id = o.Id,
                OrderNumber = o.OrderNumber,
                WarehouseId = o.WarehouseId,
                WarehouseName = o.Warehouse!.Name,
                WarehouseLocation = o.Warehouse!.Location,
                ItemCount = o.Items.Count,
                TotalQuantity = o.Items.Sum(i => i.Quantity),
                Priority = o.Priority
            })
            .ToListAsync();
    }

    public async Task<PackageOrderDetailDto> GetByIdAsync(Guid id)
    {
        var order = await _db.PackageOrders
            .AsNoTracking()
            .Include(o => o.Warehouse)
            .Include(o => o.Shipment)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(o => o.Id == id)
            ?? throw new NotFoundException("Package order not found.");

        return ToDetailDto(order);
    }

    public async Task<PackageOrderDetailDto> CancelAsync(Guid id)
    {
        var order = await _db.PackageOrders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id)
            ?? throw new NotFoundException("Package order not found.");

        if (order.Status != "Pending")
            throw new BadRequestException($"Only Pending package orders can be cancelled (this one is {order.Status}).");

        var now = DateTime.UtcNow;

        // Restock everything this order reserved.
        var requestedByProduct = order.Items.GroupBy(i => i.ProductId).ToDictionary(g => g.Key, g => g.Sum(i => i.Quantity));
        var productIds = requestedByProduct.Keys.ToList();
        var inventories = await _db.Inventory
            .Where(i => i.WarehouseId == order.WarehouseId && productIds.Contains(i.ProductId))
            .ToListAsync();

        foreach (var (productId, quantity) in requestedByProduct)
        {
            var inv = inventories.FirstOrDefault(i => i.ProductId == productId);
            if (inv == null)
            {
                inv = new Inventory { Id = Guid.NewGuid(), ProductId = productId, WarehouseId = order.WarehouseId, QuantityOnHand = 0, UpdatedAt = now };
                _db.Inventory.Add(inv);
            }
            inv.QuantityOnHand += quantity;
            inv.UpdatedAt = now;

            _db.StockMovements.Add(new StockMovement
            {
                Id = Guid.NewGuid(),
                ProductId = productId,
                WarehouseId = order.WarehouseId,
                MovementType = "IN",
                Quantity = quantity,
                Reason = $"Package order {order.OrderNumber} cancelled — stock returned",
                ReferenceNo = order.OrderNumber,
                PerformedBy = "system",
                CreatedAt = now
            });
        }

        order.Status = "Cancelled";
        order.CancelledAt = now;

        await _db.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    private static string GenerateOrderNumber()
    {
        var datePart = DateTime.UtcNow.ToString("yyyyMMdd");
        var randomPart = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
        return $"PKG-{datePart}-{randomPart}";
    }

    private static PackageOrderDetailDto ToDetailDto(PackageOrder o) => new()
    {
        Id = o.Id,
        OrderNumber = o.OrderNumber,
        WarehouseId = o.WarehouseId,
        WarehouseName = o.Warehouse?.Name ?? string.Empty,
        WarehouseLocation = o.Warehouse?.Location,
        Status = o.Status,
        Priority = o.Priority,
        Notes = o.Notes,
        ExpectedShipDate = o.ExpectedShipDate,
        Items = o.Items.Select(i => new PackageOrderItemDto
        {
            ProductId = i.ProductId,
            ProductName = i.Product?.Name ?? string.Empty,
            Sku = i.Product?.Sku ?? string.Empty,
            Quantity = i.Quantity,
            CustomizationNote = i.CustomizationNote
        }).ToList(),
        ShipmentId = o.ShipmentId,
        ShipmentOrderNumber = o.Shipment?.OrderNumber,
        ShippedAt = o.ShippedAt,
        CancelledAt = o.CancelledAt,
        CreatedAt = o.CreatedAt
    };
}
