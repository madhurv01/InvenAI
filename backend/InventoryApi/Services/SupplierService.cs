using InventoryApi.Data;
using InventoryApi.DTOs;
using InventoryApi.Middleware;
using InventoryApi.Models;
using InventoryApi.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InventoryApi.Services;

public class SupplierService : ISupplierService
{
    private readonly InventoryDbContext _db;

    public SupplierService(InventoryDbContext db)
    {
        _db = db;
    }

    public async Task<List<SupplierDto>> GetAllAsync(string? search)
    {
        var query = _db.Suppliers.Include(s => s.Products).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(x => x.Name.ToLower().Contains(s) || (x.Email != null && x.Email.ToLower().Contains(s)));
        }

        var suppliers = await query.OrderBy(x => x.Name).ToListAsync();
        return suppliers.Select(MapToDto).ToList();
    }

    public async Task<SupplierDto> GetByIdAsync(Guid id)
    {
        var supplier = await _db.Suppliers.Include(s => s.Products).FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new NotFoundException($"Supplier with id '{id}' was not found.");

        return MapToDto(supplier);
    }

    public async Task<SupplierDto> CreateAsync(CreateSupplierDto dto)
    {
        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            ContactPerson = dto.ContactPerson,
            Email = dto.Email,
            Phone = dto.Phone,
            Address = dto.Address,
            LeadTimeDays = dto.LeadTimeDays,
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Suppliers.Add(supplier);
        await _db.SaveChangesAsync();

        return MapToDto(supplier);
    }

    public async Task<SupplierDto> UpdateAsync(Guid id, UpdateSupplierDto dto)
    {
        var supplier = await _db.Suppliers.FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new NotFoundException($"Supplier with id '{id}' was not found.");

        supplier.Name = dto.Name.Trim();
        supplier.ContactPerson = dto.ContactPerson;
        supplier.Email = dto.Email;
        supplier.Phone = dto.Phone;
        supplier.Address = dto.Address;
        supplier.LeadTimeDays = dto.LeadTimeDays;
        supplier.IsActive = dto.IsActive;

        await _db.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task DeleteAsync(Guid id)
    {
        var supplier = await _db.Suppliers.FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new NotFoundException($"Supplier with id '{id}' was not found.");

        var hasProducts = await _db.Products.AnyAsync(p => p.SupplierId == id);
        if (hasProducts)
            throw new BadRequestException("Cannot delete a supplier that is still associated with products. Reassign those products first.");

        _db.Suppliers.Remove(supplier);
        await _db.SaveChangesAsync();
    }

    private static SupplierDto MapToDto(Supplier s) => new()
    {
        Id = s.Id,
        Name = s.Name,
        ContactPerson = s.ContactPerson,
        Email = s.Email,
        Phone = s.Phone,
        Address = s.Address,
        LeadTimeDays = s.LeadTimeDays,
        IsActive = s.IsActive,
        AssociatedProductCount = s.Products?.Count ?? 0
    };
}
