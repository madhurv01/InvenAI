using InventoryApi.Data;
using InventoryApi.DTOs;
using InventoryApi.Middleware;
using InventoryApi.Models;
using InventoryApi.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace InventoryApi.Services;

public class CategoryService : ICategoryService
{
    private const string CacheKey = "categories:all";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(30);

    private readonly InventoryDbContext _db;
    private readonly IMemoryCache _cache;

    public CategoryService(InventoryDbContext db, IMemoryCache cache)
    {
        _db = db;
        _cache = cache;
    }

    // Categories/products rarely change relative to how often every product/package-order/
    // workflow form re-fetches this list — a short cache collapses repeated identical queries
    // without meaningfully delaying visibility of real changes (self-heals within 30s even for
    // changes this service doesn't directly invalidate, e.g. a product's category reassignment).
    public async Task<List<CategoryDto>> GetAllAsync()
    {
        if (_cache.TryGetValue(CacheKey, out List<CategoryDto>? cached) && cached != null)
            return cached;

        var result = await _db.Categories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                CreatedAt = c.CreatedAt,
                ProductCount = c.Products.Count
            })
            .ToListAsync();

        _cache.Set(CacheKey, result, CacheDuration);
        return result;
    }

    public async Task<CategoryDto> CreateAsync(CreateCategoryDto dto)
    {
        var nameExists = await _db.Categories.AnyAsync(c => c.Name == dto.Name);
        if (nameExists)
            throw new BadRequestException($"A category named '{dto.Name}' already exists.");

        var category = new Category
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            Description = dto.Description,
            CreatedAt = DateTime.UtcNow
        };

        _db.Categories.Add(category);
        await _db.SaveChangesAsync();
        _cache.Remove(CacheKey);

        return new CategoryDto { Id = category.Id, Name = category.Name, Description = category.Description, CreatedAt = category.CreatedAt, ProductCount = 0 };
    }

    public async Task<CategoryDto> UpdateAsync(Guid id, UpdateCategoryDto dto)
    {
        var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new NotFoundException($"Category with id '{id}' was not found.");

        var nameExists = await _db.Categories.AnyAsync(c => c.Name == dto.Name && c.Id != id);
        if (nameExists)
            throw new BadRequestException($"Another category already uses the name '{dto.Name}'.");

        category.Name = dto.Name.Trim();
        category.Description = dto.Description;
        await _db.SaveChangesAsync();
        _cache.Remove(CacheKey);

        var productCount = await _db.Products.CountAsync(p => p.CategoryId == id);
        return new CategoryDto { Id = category.Id, Name = category.Name, Description = category.Description, CreatedAt = category.CreatedAt, ProductCount = productCount };
    }

    public async Task DeleteAsync(Guid id)
    {
        var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new NotFoundException($"Category with id '{id}' was not found.");

        var hasProducts = await _db.Products.AnyAsync(p => p.CategoryId == id);
        if (hasProducts)
            throw new BadRequestException("Cannot delete a category that still has products assigned. Reassign those products first.");

        _db.Categories.Remove(category);
        await _db.SaveChangesAsync();
        _cache.Remove(CacheKey);
    }
}
