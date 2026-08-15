using InventoryApi.Data;
using InventoryApi.DTOs;
using InventoryApi.Middleware;
using InventoryApi.Models;
using InventoryApi.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InventoryApi.Services;

public class WarehouseService : IWarehouseService
{
    private readonly InventoryDbContext _db;

    public WarehouseService(InventoryDbContext db)
    {
        _db = db;
    }

    public async Task<List<WarehouseManageDto>> GetAllAsync()
    {
        return await _db.Warehouses
            .AsNoTracking()
            .OrderBy(w => w.Name)
            .Select(w => new WarehouseManageDto
            {
                Id = w.Id,
                Name = w.Name,
                Location = w.Location,
                IsActive = w.IsActive,
                CreatedAt = w.CreatedAt,
                ProductCount = _db.Inventory.Where(i => i.WarehouseId == w.Id).Select(i => i.ProductId).Distinct().Count(),
                TotalUnits = _db.Inventory.Where(i => i.WarehouseId == w.Id).Sum(i => (int?)i.QuantityOnHand) ?? 0
            })
            .ToListAsync();
    }

    public async Task<WarehouseManageDto> CreateAsync(CreateWarehouseDto dto)
    {
        var warehouse = new Warehouse
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            Location = dto.Location,
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _db.Warehouses.Add(warehouse);
        await _db.SaveChangesAsync();

        return new WarehouseManageDto { Id = warehouse.Id, Name = warehouse.Name, Location = warehouse.Location, IsActive = warehouse.IsActive, CreatedAt = warehouse.CreatedAt, ProductCount = 0, TotalUnits = 0 };
    }

    public async Task<WarehouseManageDto> UpdateAsync(Guid id, UpdateWarehouseDto dto)
    {
        var warehouse = await _db.Warehouses.FirstOrDefaultAsync(w => w.Id == id)
            ?? throw new NotFoundException($"Warehouse with id '{id}' was not found.");

        warehouse.Name = dto.Name.Trim();
        warehouse.Location = dto.Location;
        warehouse.IsActive = dto.IsActive;
        await _db.SaveChangesAsync();

        var productCount = await _db.Inventory.Where(i => i.WarehouseId == id).Select(i => i.ProductId).Distinct().CountAsync();
        var totalUnits = await _db.Inventory.Where(i => i.WarehouseId == id).SumAsync(i => (int?)i.QuantityOnHand) ?? 0;

        return new WarehouseManageDto { Id = warehouse.Id, Name = warehouse.Name, Location = warehouse.Location, IsActive = warehouse.IsActive, CreatedAt = warehouse.CreatedAt, ProductCount = productCount, TotalUnits = totalUnits };
    }

    public async Task DeleteAsync(Guid id)
    {
        var warehouse = await _db.Warehouses.FirstOrDefaultAsync(w => w.Id == id)
            ?? throw new NotFoundException($"Warehouse with id '{id}' was not found.");

        var hasInventory = await _db.Inventory.AnyAsync(i => i.WarehouseId == id && i.QuantityOnHand > 0);
        if (hasInventory)
            throw new BadRequestException("Cannot delete a warehouse that still holds stock. Move or zero out inventory first.");

        _db.Warehouses.Remove(warehouse);
        await _db.SaveChangesAsync();
    }
}
