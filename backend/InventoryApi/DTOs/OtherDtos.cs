using System.ComponentModel.DataAnnotations;

namespace InventoryApi.DTOs;

// ---------- Suppliers ----------
public class SupplierDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public int LeadTimeDays { get; set; }
    public bool IsActive { get; set; }
    public int AssociatedProductCount { get; set; }
}

public class CreateSupplierDto
{
    [Required, StringLength(150)]
    public string Name { get; set; } = string.Empty;

    [StringLength(150)]
    public string? ContactPerson { get; set; }

    [EmailAddress, StringLength(200)]
    public string? Email { get; set; }

    [Phone, StringLength(30)]
    public string? Phone { get; set; }

    [StringLength(300)]
    public string? Address { get; set; }

    [Range(0, 365)]
    public int LeadTimeDays { get; set; } = 7;

    public bool IsActive { get; set; } = true;
}

public class UpdateSupplierDto : CreateSupplierDto { }

// ---------- Categories ----------
public class CategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int ProductCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateCategoryDto
{
    [Required, StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [StringLength(400)]
    public string? Description { get; set; }
}

public class UpdateCategoryDto : CreateCategoryDto { }

// ---------- Warehouses ----------
public class WarehouseManageDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Location { get; set; }
    public bool IsActive { get; set; }
    public int ProductCount { get; set; }
    public int TotalUnits { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateWarehouseDto
{
    [Required, StringLength(150)]
    public string Name { get; set; } = string.Empty;

    [StringLength(300)]
    public string? Location { get; set; }

    public bool IsActive { get; set; } = true;
}

public class UpdateWarehouseDto : CreateWarehouseDto { }

// ---------- Pagination ----------
public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}

// ---------- Dashboard analytics ----------
public class WarehouseHeatmapCellDto
{
    public string WarehouseName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public int QuantityOnHand { get; set; }
}

public class MovementTrendPointDto
{
    public DateOnly Date { get; set; }
    public int StockIn { get; set; }
    public int StockOut { get; set; }
    public int Adjustments { get; set; }
}

public class StockStatusBreakdownDto
{
    public int InStock { get; set; }
    public int LowStock { get; set; }
    public int OutOfStock { get; set; }
}

public class DashboardAnalyticsDto
{
    public List<WarehouseHeatmapCellDto> Heatmap { get; set; } = new();
    public List<MovementTrendPointDto> MovementTrend { get; set; } = new();
    public StockStatusBreakdownDto StockStatus { get; set; } = new();
    public List<CategoryBreakdownDto> TopValueCategories { get; set; } = new();
}

// ---------- Dashboard ----------
public class DashboardSummaryDto
{
    public int TotalProducts { get; set; }
    public decimal TotalInventoryValue { get; set; }
    public int LowStockCount { get; set; }
    public int TotalStockUnits { get; set; }
    public List<InventoryItemDto> LowStockProducts { get; set; } = new();
    public List<StockMovementDto> RecentMovements { get; set; } = new();
    public List<CategoryBreakdownDto> CategoryBreakdown { get; set; } = new();
}

public class CategoryBreakdownDto
{
    public string CategoryName { get; set; } = "Uncategorized";
    public int ProductCount { get; set; }
    public decimal InventoryValue { get; set; }
}

// ---------- Chat (AI) ----------
public class ChatRequestDto
{
    [Required, StringLength(1000)]
    public string Question { get; set; } = string.Empty;

    public Guid? ConversationId { get; set; }
}

public class ChatResponseDto
{
    public Guid ConversationId { get; set; }
    public string Answer { get; set; } = string.Empty;
    public string? Sql { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

public class ChatConversationSummaryDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
}

public class ChatMessageDto
{
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class ChatConversationDetailDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public List<ChatMessageDto> Messages { get; set; } = new();
}

// ---------- Shipments ----------
public class CreateShipmentDto
{
    [StringLength(200)]
    public string? Reference { get; set; }

    /// <summary>Optional — link a Pending Package Order to this shipment. It's marked Shipped once the shipment is created.</summary>
    public Guid? PackageOrderId { get; set; }

    [Required, StringLength(300)]
    public string OriginName { get; set; } = string.Empty;
    [Required]
    public double OriginLat { get; set; }
    [Required]
    public double OriginLng { get; set; }

    [Required, StringLength(300)]
    public string DestinationName { get; set; } = string.Empty;
    [Required]
    public double DestinationLat { get; set; }
    [Required]
    public double DestinationLng { get; set; }
}

public class ShipmentSummaryDto
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string? Reference { get; set; }
    public string? PackageOrderNumber { get; set; }
    public string OriginName { get; set; } = string.Empty;
    public string DestinationName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal DistanceKm { get; set; }
    public double ProgressPercent { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime EstimatedArrivalAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ShipmentDetailDto
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string? Reference { get; set; }

    public Guid? PackageOrderId { get; set; }
    public string? PackageOrderNumber { get; set; }

    public string OriginName { get; set; } = string.Empty;
    public double OriginLat { get; set; }
    public double OriginLng { get; set; }

    public string DestinationName { get; set; } = string.Empty;
    public double DestinationLat { get; set; }
    public double DestinationLng { get; set; }

    public List<double[]> Route { get; set; } = new(); // [ [lat,lng], ... ]
    public decimal DistanceKm { get; set; }
    public int DurationMinutes { get; set; }

    public string Status { get; set; } = string.Empty;
    public double ProgressPercent { get; set; }

    public DateTime StartedAt { get; set; }
    public DateTime EstimatedArrivalAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UpdateShipmentStatusDto
{
    [Required]
    public string Status { get; set; } = string.Empty; // Delivered | Cancelled
}

// ---------- Package Orders ----------
public class CreatePackageOrderItemDto
{
    [Required]
    public Guid ProductId { get; set; }
    [Required, Range(1, int.MaxValue)]
    public int Quantity { get; set; }
    [StringLength(500)]
    public string? CustomizationNote { get; set; }
}

public class CreatePackageOrderDto
{
    [Required]
    public Guid WarehouseId { get; set; }

    public string Priority { get; set; } = "Normal"; // Low | Normal | High

    [StringLength(500)]
    public string? Notes { get; set; }

    public DateOnly? ExpectedShipDate { get; set; }

    [Required, MinLength(1)]
    public List<CreatePackageOrderItemDto> Items { get; set; } = new();
}

public class PackageOrderItemDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string? CustomizationNote { get; set; }
}

public class PackageOrderSummaryDto
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    public int TotalQuantity { get; set; }
    public DateOnly? ExpectedShipDate { get; set; }
    public string? ShipmentOrderNumber { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>Slim shape used to populate the "link a package order" picker on the New Shipment page.</summary>
public class PackageOrderPendingDto
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string? WarehouseLocation { get; set; }
    public int ItemCount { get; set; }
    public int TotalQuantity { get; set; }
    public string Priority { get; set; } = string.Empty;
}

public class PackageOrderDetailDto
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string? WarehouseLocation { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateOnly? ExpectedShipDate { get; set; }
    public List<PackageOrderItemDto> Items { get; set; } = new();
    public Guid? ShipmentId { get; set; }
    public string? ShipmentOrderNumber { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

// ---------- Auth ----------
public class LoginRequestDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class RegisterRequestDto
{
    [Required, StringLength(150)]
    public string FullName { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(6)]
    public string Password { get; set; } = string.Empty;

    public string Role { get; set; } = "Staff";
}

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

// ---------- Generic API error shape ----------
public class ApiErrorResponse
{
    public string Message { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public int StatusCode { get; set; }
}
