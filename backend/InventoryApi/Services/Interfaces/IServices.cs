using InventoryApi.DTOs;

namespace InventoryApi.Services.Interfaces;

public interface IProductService
{
    Task<PagedResult<ProductDto>> GetAllAsync(string? search, Guid? categoryId, string? status, int page, int pageSize, string? sortBy, bool sortDesc);
    Task<ProductDto> GetByIdAsync(Guid id);
    Task<ProductDto> CreateAsync(CreateProductDto dto);
    Task<ProductDto> UpdateAsync(Guid id, UpdateProductDto dto);
    Task DeleteAsync(Guid id);
}

public interface ISupplierService
{
    Task<PagedResult<SupplierDto>> GetAllAsync(string? search, int page, int pageSize);
    Task<SupplierDto> GetByIdAsync(Guid id);
    Task<SupplierDto> CreateAsync(CreateSupplierDto dto);
    Task<SupplierDto> UpdateAsync(Guid id, UpdateSupplierDto dto);
    Task DeleteAsync(Guid id);
}

public interface ICategoryService
{
    Task<List<CategoryDto>> GetAllAsync();
    Task<CategoryDto> CreateAsync(CreateCategoryDto dto);
    Task<CategoryDto> UpdateAsync(Guid id, UpdateCategoryDto dto);
    Task DeleteAsync(Guid id);
}

public interface IWarehouseService
{
    Task<List<WarehouseManageDto>> GetAllAsync();
    Task<WarehouseManageDto> CreateAsync(CreateWarehouseDto dto);
    Task<WarehouseManageDto> UpdateAsync(Guid id, UpdateWarehouseDto dto);
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
    Task<DashboardAnalyticsDto> GetAnalyticsAsync();
}

public interface IChatService
{
    Task<ChatResponseDto> AskAsync(Guid userId, string question, Guid? conversationId);
    Task<List<ChatConversationSummaryDto>> GetConversationsAsync(Guid userId);
    Task<ChatConversationDetailDto> GetConversationAsync(Guid userId, Guid conversationId);
    Task DeleteConversationAsync(Guid userId, Guid conversationId);
}

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterRequestDto dto);
    Task<AuthResponseDto> LoginAsync(LoginRequestDto dto);
}

public interface IInvoiceExtractionService
{
    Task<ExtractedInvoiceDto> ExtractAsync(ExtractInvoiceRequestDto request);
    Task<InvoiceSummaryDto> SaveAsync(SaveInvoiceRequestDto dto, Guid? userId);
    Task<List<InvoiceSummaryDto>> GetAllAsync();
    Task<(byte[] Data, string FileName)> GetPdfAsync(Guid id);
    Task DeleteAsync(Guid id);
}
