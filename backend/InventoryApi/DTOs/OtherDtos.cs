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
