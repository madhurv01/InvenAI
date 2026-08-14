using System.ComponentModel.DataAnnotations;

namespace InventoryApi.DTOs;

public class ProductDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public Guid? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public Guid? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public decimal UnitPrice { get; set; }
    public int MinimumStockLevel { get; set; }
    public string Status { get; set; } = "Active";
    public int TotalStock { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateProductDto
{
    [Required, StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required, StringLength(60)]
    public string Sku { get; set; } = string.Empty;

    public Guid? CategoryId { get; set; }
    public Guid? SupplierId { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Unit price must be zero or greater")]
    public decimal UnitPrice { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "Minimum stock level must be zero or greater")]
    public int MinimumStockLevel { get; set; }

    [RegularExpression("Active|Inactive|Discontinued")]
    public string Status { get; set; } = "Active";
}

public class UpdateProductDto : CreateProductDto
{
}
