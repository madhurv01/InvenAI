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

public interface IShipmentService
{
    Task<ShipmentDetailDto> CreateAsync(CreateShipmentDto dto, Guid? userId);
    Task<List<ShipmentSummaryDto>> GetAllAsync();
    Task<ShipmentDetailDto> GetByIdAsync(Guid id);
    Task<ShipmentDetailDto> UpdateStatusAsync(Guid id, string status);
    Task DeleteAsync(Guid id);
}

public interface IPackageOrderService
{
    Task<PackageOrderDetailDto> CreateAsync(CreatePackageOrderDto dto, Guid? userId);
    Task<List<PackageOrderSummaryDto>> GetAllAsync();
    Task<List<PackageOrderPendingDto>> GetPendingAsync();
    Task<PackageOrderDetailDto> GetByIdAsync(Guid id);
    Task<PackageOrderDetailDto> CancelAsync(Guid id);
}

public interface IEmailService
{
    /// <summary>Sends an email via Gmail SMTP. Returns false (and logs a warning) instead of throwing if Email:Username/AppPassword aren't configured, so callers can record that in a workflow's activity log.</summary>
    Task<bool> SendAsync(string toEmail, string subject, string body);
}

public interface IWorkflowService
{
    Task<WorkflowDetailDto> CreateAlertAsync(CreateAlertWorkflowDto dto, Guid? userId);
    Task<WorkflowDetailDto> CreateTriggerAsync(CreateTriggerWorkflowDto dto, Guid? userId);
    Task<WorkflowDetailDto> CreateSupplyChainAsync(CreateSupplyChainWorkflowDto dto, Guid? userId);
    Task<List<WorkflowSummaryDto>> GetAllAsync();
    Task<WorkflowDetailDto> GetByIdAsync(Guid id);
    Task<WorkflowDetailDto> PauseAsync(Guid id);
    Task<WorkflowDetailDto> ResumeAsync(Guid id);
    Task DeleteAsync(Guid id);
}

public interface IInvoiceExtractionService
{
    Task<ExtractedInvoiceDto> ExtractAsync(ExtractInvoiceRequestDto request);
    Task<InvoiceSummaryDto> SaveAsync(SaveInvoiceRequestDto dto, Guid? userId);
    Task<List<InvoiceSummaryDto>> GetAllAsync();
    Task<(byte[] Data, string FileName)> GetPdfAsync(Guid id);
    Task DeleteAsync(Guid id);
}
