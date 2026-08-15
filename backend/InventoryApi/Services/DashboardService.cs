using InventoryApi.Data;
using InventoryApi.DTOs;
using InventoryApi.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InventoryApi.Services;

public class DashboardService : IDashboardService
{
    private readonly IInventoryService _inventoryService;
    private readonly InventoryDbContext _db;

    public DashboardService(IInventoryService inventoryService, InventoryDbContext db)
    {
        _inventoryService = inventoryService;
        _db = db;
    }

    public Task<DashboardSummaryDto> GetSummaryAsync() => _inventoryService.GetInventorySummaryAsync();

    public async Task<DashboardAnalyticsDto> GetAnalyticsAsync()
    {
        // Warehouse x category stock heatmap — aggregated server-side.
        var heatmap = await _db.Inventory
            .AsNoTracking()
            .GroupBy(i => new
            {
                WarehouseName = i.Warehouse!.Name,
                CategoryName = i.Product!.Category != null ? i.Product.Category.Name : "Uncategorized"
            })
            .Select(g => new WarehouseHeatmapCellDto
            {
                WarehouseName = g.Key.WarehouseName,
                CategoryName = g.Key.CategoryName,
                QuantityOnHand = g.Sum(x => x.QuantityOnHand)
            })
            .ToListAsync();

        // 14-day movement trend, zero-filled for days with no activity.
        var since = DateTime.UtcNow.Date.AddDays(-13);
        var rawMovements = await _db.StockMovements
            .AsNoTracking()
            .Where(m => m.CreatedAt >= since)
            .Select(m => new { m.MovementType, m.Quantity, m.CreatedAt })
            .ToListAsync();

        var trend = new List<MovementTrendPointDto>();
        for (var d = 0; d < 14; d++)
        {
            var day = DateOnly.FromDateTime(since.AddDays(d));
            var dayMovements = rawMovements.Where(m => DateOnly.FromDateTime(m.CreatedAt) == day).ToList();
            trend.Add(new MovementTrendPointDto
            {
                Date = day,
                StockIn = dayMovements.Where(m => m.MovementType == "IN").Sum(m => m.Quantity),
                StockOut = dayMovements.Where(m => m.MovementType == "OUT").Sum(m => m.Quantity),
                Adjustments = dayMovements.Count(m => m.MovementType == "ADJUSTMENT")
            });
        }

        // Stock status breakdown, computed from a lightweight per-product projection.
        var productAgg = await _db.Products
            .AsNoTracking()
            .Select(p => new
            {
                p.MinimumStockLevel,
                p.UnitPrice,
                CategoryName = p.Category != null ? p.Category.Name : "Uncategorized",
                TotalStock = p.InventoryRecords.Sum(i => (int?)i.QuantityOnHand) ?? 0
            })
            .ToListAsync();

        var stockStatus = new StockStatusBreakdownDto
        {
            OutOfStock = productAgg.Count(p => p.TotalStock == 0),
            LowStock = productAgg.Count(p => p.TotalStock > 0 && p.TotalStock <= p.MinimumStockLevel),
            InStock = productAgg.Count(p => p.TotalStock > p.MinimumStockLevel)
        };

        var topValueCategories = productAgg
            .GroupBy(p => p.CategoryName)
            .Select(g => new CategoryBreakdownDto
            {
                CategoryName = g.Key,
                ProductCount = g.Count(),
                InventoryValue = g.Sum(p => p.UnitPrice * p.TotalStock)
            })
            .OrderByDescending(c => c.InventoryValue)
            .Take(6)
            .ToList();

        return new DashboardAnalyticsDto
        {
            Heatmap = heatmap,
            MovementTrend = trend,
            StockStatus = stockStatus,
            TopValueCategories = topValueCategories
        };
    }
}
