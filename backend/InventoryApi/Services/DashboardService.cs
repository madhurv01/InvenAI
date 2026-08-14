using InventoryApi.DTOs;
using InventoryApi.Services.Interfaces;

namespace InventoryApi.Services;

public class DashboardService : IDashboardService
{
    private readonly IInventoryService _inventoryService;

    public DashboardService(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    public Task<DashboardSummaryDto> GetSummaryAsync() => _inventoryService.GetInventorySummaryAsync();
}
