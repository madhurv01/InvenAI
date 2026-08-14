using System.ComponentModel.DataAnnotations;

namespace InventoryApi.DTOs;

public class InventoryItemDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public int QuantityOnHand { get; set; }
    public int MinimumStockLevel { get; set; }
    public bool IsLowStock { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class StockMovementDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string MovementType { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string? Reason { get; set; }
    public string? ReferenceNo { get; set; }
    public string? PerformedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateStockMovementDto
{
    [Required]
    public Guid ProductId { get; set; }

    [Required]
    public Guid WarehouseId { get; set; }

    [Required, RegularExpression("IN|OUT|ADJUSTMENT")]
    public string MovementType { get; set; } = "IN";

    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be greater than zero")]
    public int Quantity { get; set; }

    [StringLength(300)]
    public string? Reason { get; set; }

    [StringLength(80)]
    public string? ReferenceNo { get; set; }

    public string? PerformedBy { get; set; }
}

public class WarehouseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Location { get; set; }
}
