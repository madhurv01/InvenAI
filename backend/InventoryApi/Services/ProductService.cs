using InventoryApi.Data;
using InventoryApi.DTOs;
using InventoryApi.Middleware;
using InventoryApi.Models;
using InventoryApi.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InventoryApi.Services;

public class ProductService : IProductService
{
    private readonly InventoryDbContext _db;

    public ProductService(InventoryDbContext db)
    {
        _db = db;
    }

    public async Task<List<ProductDto>> GetAllAsync(string? search, Guid? categoryId, string? status)
    {
        var query = _db.Products
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .Include(p => p.InventoryRecords)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(p => p.Name.ToLower().Contains(s) || p.Sku.ToLower().Contains(s));
        }

        if (categoryId.HasValue)
            query = query.Where(p => p.CategoryId == categoryId);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(p => p.Status == status);

        var products = await query.OrderBy(p => p.Name).ToListAsync();

        return products.Select(MapToDto).ToList();
    }

    public async Task<ProductDto> GetByIdAsync(Guid id)
    {
        var product = await _db.Products
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .Include(p => p.InventoryRecords)
            .FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new NotFoundException($"Product with id '{id}' was not found.");

        return MapToDto(product);
    }

    public async Task<ProductDto> CreateAsync(CreateProductDto dto)
    {
        var skuExists = await _db.Products.AnyAsync(p => p.Sku == dto.Sku);
        if (skuExists)
            throw new BadRequestException($"A product with SKU '{dto.Sku}' already exists.");

        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            Sku = dto.Sku.Trim(),
            CategoryId = dto.CategoryId,
            SupplierId = dto.SupplierId,
            UnitPrice = dto.UnitPrice,
            MinimumStockLevel = dto.MinimumStockLevel,
            Status = dto.Status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Products.Add(product);
        await _db.SaveChangesAsync();

        return await GetByIdAsync(product.Id);
    }

    public async Task<ProductDto> UpdateAsync(Guid id, UpdateProductDto dto)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new NotFoundException($"Product with id '{id}' was not found.");

        var duplicateSku = await _db.Products.AnyAsync(p => p.Sku == dto.Sku && p.Id != id);
        if (duplicateSku)
            throw new BadRequestException($"Another product already uses SKU '{dto.Sku}'.");

        product.Name = dto.Name.Trim();
        product.Sku = dto.Sku.Trim();
        product.CategoryId = dto.CategoryId;
        product.SupplierId = dto.SupplierId;
        product.UnitPrice = dto.UnitPrice;
        product.MinimumStockLevel = dto.MinimumStockLevel;
        product.Status = dto.Status;

        await _db.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task DeleteAsync(Guid id)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new NotFoundException($"Product with id '{id}' was not found.");

        _db.Products.Remove(product);
        await _db.SaveChangesAsync();
    }

    private static ProductDto MapToDto(Product p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        Sku = p.Sku,
        CategoryId = p.CategoryId,
        CategoryName = p.Category?.Name,
        SupplierId = p.SupplierId,
        SupplierName = p.Supplier?.Name,
        UnitPrice = p.UnitPrice,
        MinimumStockLevel = p.MinimumStockLevel,
        Status = p.Status,
        TotalStock = p.InventoryRecords?.Sum(i => i.QuantityOnHand) ?? 0,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt
    };
}
