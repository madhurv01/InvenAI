using InventoryApi.DTOs;

namespace InventoryApi.Services.Interfaces;

public interface IProductService
{
    Task<List<ProductDto>> GetAllAsync(string? search, Guid? categoryId, string? status);
    Task<ProductDto> GetByIdAsync(Guid id);
    Task<ProductDto> CreateAsync(CreateProductDto dto);
    Task<ProductDto> UpdateAsync(Guid id, UpdateProductDto dto);
    Task DeleteAsync(Guid id);
}

public interface ISupplierService
{
    Task<List<SupplierDto>> GetAllAsync(string? search);
    Task<SupplierDto> GetByIdAsync(Guid id);
    Task<SupplierDto> CreateAsync(CreateSupplierDto dto);
    Task<SupplierDto> UpdateAsync(Guid id, UpdateSupplierDto dto);
    Task DeleteAsync(Guid id);
}

public interface IInventoryService
{
    Task<List<InventoryItemDto>> GetStockAsync(Guid? productId, Guid? warehouseId, bool? lowStockOnly);
    Task<StockMovementDto> RecordMovementAsync(CreateStockMovementDto dto);
    Task<List<StockMovementDto>> GetMovementHistoryAsync(Guid? productId, Guid? warehouseId, int take);
    Task<List<WarehouseDto>> GetWarehousesAsync();

    // Controlled functions exposed to the AI layer — no arbitrary SQL.
    Task<List<InventoryItemDto>> GetLowStockProductsAsync();
    Task<DashboardSummaryDto> GetInventorySummaryAsync();
    Task<List<StockMovementDto>> GetRecentStockMovementsAsync(int take);
}

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync();
}

public interface IAiAssistantService
{
    Task<AiChatResponseDto> AskAsync(string question);
}

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterRequestDto dto);
    Task<AuthResponseDto> LoginAsync(LoginRequestDto dto);
}
