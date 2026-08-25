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

public class ChatConversation
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = "New chat";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
}

public class ChatMessage
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public string Role { get; set; } = string.Empty; // user | assistant
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class Shipment
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string? Reference { get; set; }

    public string OriginName { get; set; } = string.Empty;
    public double OriginLat { get; set; }
    public double OriginLng { get; set; }

    public string DestinationName { get; set; } = string.Empty;
    public double DestinationLat { get; set; }
    public double DestinationLng { get; set; }

    public string RouteGeoJson { get; set; } = "[]";
    public decimal DistanceKm { get; set; }
    public int DurationMinutes { get; set; }

    public string Status { get; set; } = "InTransit"; // Pending | InTransit | Delivered | Cancelled

    public DateTime StartedAt { get; set; }
    public DateTime EstimatedArrivalAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime? CancelledAt { get; set; }

    public Guid? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PackageOrder
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public string Status { get; set; } = "Pending"; // Pending | Shipped | Cancelled
    public string Priority { get; set; } = "Normal"; // Low | Normal | High
    public string? Notes { get; set; }
    public DateOnly? ExpectedShipDate { get; set; }
    public Guid? ShipmentId { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }

    public Warehouse? Warehouse { get; set; }
    public Shipment? Shipment { get; set; }
    public ICollection<PackageOrderItem> Items { get; set; } = new List<PackageOrderItem>();
}

public class PackageOrderItem
{
    public Guid Id { get; set; }
    public Guid PackageOrderId { get; set; }
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
    public string? CustomizationNote { get; set; }

    public Product? Product { get; set; }
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
