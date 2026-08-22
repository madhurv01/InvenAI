namespace InventoryApi.Models;

public class Category
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<Product> Products { get; set; } = new List<Product>();
}

public class Supplier
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public int LeadTimeDays { get; set; } = 7;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<Product> Products { get; set; } = new List<Product>();
}

public class Warehouse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Location { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}

public class Product
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public Guid? CategoryId { get; set; }
    public Guid? SupplierId { get; set; }
    public decimal UnitPrice { get; set; }
    public int MinimumStockLevel { get; set; }
    public string Status { get; set; } = "Active"; // Active | Inactive | Discontinued
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Category? Category { get; set; }
    public Supplier? Supplier { get; set; }
    public ICollection<Inventory> InventoryRecords { get; set; } = new List<Inventory>();
}

public class Inventory
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Guid WarehouseId { get; set; }
    public int QuantityOnHand { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Product? Product { get; set; }
    public Warehouse? Warehouse { get; set; }
}

public class StockMovement
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Guid WarehouseId { get; set; }
    public string MovementType { get; set; } = string.Empty; // IN | OUT | ADJUSTMENT
    public int Quantity { get; set; }
    public string? Reason { get; set; }
    public string? ReferenceNo { get; set; }
    public string? PerformedBy { get; set; }
    public DateTime CreatedAt { get; set; }

    public Product? Product { get; set; }
    public Warehouse? Warehouse { get; set; }
}

public class AppUser
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "Staff";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}

public class Invoice
{
    public Guid Id { get; set; }
    public string VendorName { get; set; } = string.Empty;
    public string? InvoiceNumber { get; set; }
    public DateOnly? InvoiceDate { get; set; }
    public string Currency { get; set; } = "INR";
    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string LineItemsJson { get; set; } = "[]";
    public string? RawAiResponseJson { get; set; }
    public byte[] PdfData { get; set; } = Array.Empty<byte>();
    public string PdfFileName { get; set; } = string.Empty;
    public string? SourceImageName { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}
