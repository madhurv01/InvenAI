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

// ---------- Categories / Warehouses (lightweight lookups) ----------
public class CategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
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

// ---------- AI Assistant ----------
public class AiChatRequestDto
{
    [Required, StringLength(1000)]
    public string Question { get; set; } = string.Empty;
}

public class AiChatResponseDto
{
    public string Answer { get; set; } = string.Empty;
    public string Intent { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
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
