using System.ComponentModel.DataAnnotations;

namespace InventoryApi.DTOs;

public class ExtractInvoiceRequestDto
{
    [Required]
    public string ImageBase64 { get; set; } = string.Empty;

    public string MimeType { get; set; } = "image/jpeg";
}

public class ExtractedLineItemDto
{
    public string Description { get; set; } = string.Empty;
    public decimal Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}

public class ExtractedInvoiceDto
{
    public string VendorName { get; set; } = string.Empty;
    public string? VendorAddress { get; set; }
    public string? InvoiceNumber { get; set; }
    public DateOnly? InvoiceDate { get; set; }
    public string Currency { get; set; } = "INR";
    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public List<ExtractedLineItemDto> LineItems { get; set; } = new();
    public string? ExtractionNotes { get; set; }
}

public class ExtractInvoiceResponseDto
{
    public ExtractedInvoiceDto Invoice { get; set; } = new();
    public bool UsedAiFallback { get; set; }
}

public class SaveInvoiceRequestDto : ExtractedInvoiceDto
{
    public string? SourceImageName { get; set; }
}

public class InvoiceSummaryDto
{
    public Guid Id { get; set; }
    public string VendorName { get; set; } = string.Empty;
    public string? InvoiceNumber { get; set; }
    public DateOnly? InvoiceDate { get; set; }
    public string Currency { get; set; } = "INR";
    public decimal TotalAmount { get; set; }
    public string PdfFileName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
