using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using InventoryApi.Data;
using InventoryApi.DTOs;
using InventoryApi.Middleware;
using InventoryApi.Models;
using InventoryApi.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace InventoryApi.Services;

/// <summary>
/// Invoice Extractor chain:
///   Camera/gallery photo -> Groq vision (Llama 4, structured JSON extraction)
///   -> editable preview in the UI -> on save: server-rendered PDF -> stored in Supabase Postgres (bytea).
/// </summary>
public class InvoiceExtractionService : IInvoiceExtractionService
{
    private readonly InventoryDbContext _db;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<InvoiceExtractionService> _logger;

    public InvoiceExtractionService(
        InventoryDbContext db,
        IHttpClientFactory httpClientFactory,
        IConfiguration config,
        ILogger<InvoiceExtractionService> logger)
    {
        _db = db;
        _httpClient = httpClientFactory.CreateClient("Groq");
        _config = config;
        _logger = logger;
    }

    public async Task<ExtractedInvoiceDto> ExtractAsync(ExtractInvoiceRequestDto request)
    {
        var apiKey = _config["Groq:ApiKey"];
        var model = _config["Groq:Model"] ?? "qwen/qwen3.6-27b";
        var apiUrl = _config["Groq:ApiUrl"] ?? "https://api.groq.com/openai/v1/chat/completions";

        if (string.IsNullOrWhiteSpace(apiKey) || apiKey.StartsWith("REPLACE_WITH"))
            throw new BadRequestException("Invoice extraction requires a Groq API key to be configured (Groq:ApiKey in appsettings.Development.json). Get a free key at console.groq.com.");

        const string systemPrompt =
            "You are an invoice data extraction engine. You will be shown a photo of a paper or digital invoice/receipt. " +
            "Extract the data and respond with ONLY a single JSON object — no markdown fences, no commentary, no explanation. " +
            "The JSON object must have exactly this shape: " +
            "{\"vendorName\": string, \"vendorAddress\": string|null, \"invoiceNumber\": string|null, " +
            "\"invoiceDate\": \"YYYY-MM-DD\"|null, \"currency\": string (3-letter or symbol, default \"INR\"), " +
            "\"subtotal\": number, \"taxAmount\": number, \"totalAmount\": number, " +
            "\"lineItems\": [{\"description\": string, \"quantity\": number, \"unitPrice\": number, \"lineTotal\": number}], " +
            "\"extractionNotes\": string|null (mention anything illegible or uncertain)}. " +
            "If a field truly cannot be read, use null (or 0 for numbers) rather than guessing wildly. " +
            "Numbers must be plain numbers without currency symbols or thousands separators.";

        var requestBody = new
        {
            model,
            max_tokens = 1500,
            temperature = 0.1,
            response_format = new { type = "json_object" },
            messages = new object[]
            {
                new { role = "system", content = systemPrompt },
                new
                {
                    role = "user",
                    content = new object[]
                    {
                        new { type = "text", text = "Extract this invoice's data as the specified JSON object." },
                        new
                        {
                            type = "image_url",
                            image_url = new { url = $"data:{request.MimeType};base64,{request.ImageBase64}" }
                        }
                    }
                }
            }
        };

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, apiUrl);
        httpRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
        httpRequest.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        var response = await _httpClient.SendAsync(httpRequest);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Groq vision call failed: {Status} {Body}", response.StatusCode, responseBody);
            throw new BadRequestException("The AI service could not process this image. Please try a clearer photo.");
        }

        using var doc = JsonDocument.Parse(responseBody);
        var text = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? string.Empty;

        var json = StripCodeFences(text);

        try
        {
            var parsed = JsonSerializer.Deserialize<ExtractedInvoiceDto>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? throw new BadRequestException("The AI returned an empty result.");

            if (string.IsNullOrWhiteSpace(parsed.VendorName))
                parsed.VendorName = "Unknown Vendor";

            return parsed;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse AI invoice JSON: {Json}", json);
            throw new BadRequestException("The AI's response could not be understood. Please try again with a clearer photo.");
        }
    }

    private static string StripCodeFences(string text)
    {
        var trimmed = text.Trim();
        var match = Regex.Match(trimmed, "```(?:json)?\\s*([\\s\\S]*?)```");
        return match.Success ? match.Groups[1].Value.Trim() : trimmed;
    }

    public async Task<InvoiceSummaryDto> SaveAsync(SaveInvoiceRequestDto dto, Guid? userId)
    {
        var pdfBytes = GeneratePdf(dto);
        var fileName = BuildFileName(dto);

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            VendorName = dto.VendorName,
            InvoiceNumber = dto.InvoiceNumber,
            InvoiceDate = dto.InvoiceDate,
            Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "INR" : dto.Currency,
            Subtotal = dto.Subtotal,
            TaxAmount = dto.TaxAmount,
            TotalAmount = dto.TotalAmount,
            LineItemsJson = JsonSerializer.Serialize(dto.LineItems),
            PdfData = pdfBytes,
            PdfFileName = fileName,
            SourceImageName = dto.SourceImageName,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        };

        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync();

        return MapToSummary(invoice);
    }

    public async Task<List<InvoiceSummaryDto>> GetAllAsync()
    {
        return await _db.Invoices
            .AsNoTracking()
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new InvoiceSummaryDto
            {
                Id = i.Id,
                VendorName = i.VendorName,
                InvoiceNumber = i.InvoiceNumber,
                InvoiceDate = i.InvoiceDate,
                Currency = i.Currency,
                TotalAmount = i.TotalAmount,
                PdfFileName = i.PdfFileName,
                CreatedAt = i.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<(byte[] Data, string FileName)> GetPdfAsync(Guid id)
    {
        var invoice = await _db.Invoices.AsNoTracking().FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new NotFoundException($"Invoice with id '{id}' was not found.");

        return (invoice.PdfData, invoice.PdfFileName);
    }

    public async Task DeleteAsync(Guid id)
    {
        var invoice = await _db.Invoices.FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new NotFoundException($"Invoice with id '{id}' was not found.");

        _db.Invoices.Remove(invoice);
        await _db.SaveChangesAsync();
    }

    private static string BuildFileName(SaveInvoiceRequestDto dto)
    {
        var vendor = Regex.Replace(dto.VendorName, "[^a-zA-Z0-9]+", "-").Trim('-');
        var number = string.IsNullOrWhiteSpace(dto.InvoiceNumber) ? DateTime.UtcNow.Ticks.ToString() : Regex.Replace(dto.InvoiceNumber, "[^a-zA-Z0-9]+", "-");
        return $"Invoice-{vendor}-{number}.pdf";
    }

    private static InvoiceSummaryDto MapToSummary(Invoice invoice) => new()
    {
        Id = invoice.Id,
        VendorName = invoice.VendorName,
        InvoiceNumber = invoice.InvoiceNumber,
        InvoiceDate = invoice.InvoiceDate,
        Currency = invoice.Currency,
        TotalAmount = invoice.TotalAmount,
        PdfFileName = invoice.PdfFileName,
        CreatedAt = invoice.CreatedAt
    };

    private static byte[] GeneratePdf(SaveInvoiceRequestDto dto)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        using var stream = new MemoryStream();

        Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(36);
                page.DefaultTextStyle(x => x.FontSize(11).FontFamily(Fonts.Calibri));

                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("INVOICE").FontSize(22).Bold().FontColor("#4338CA");
                            c.Item().Text(dto.VendorName).FontSize(14).SemiBold();
                            if (!string.IsNullOrWhiteSpace(dto.VendorAddress))
                                c.Item().Text(dto.VendorAddress).FontSize(9).FontColor(Colors.Grey.Darken1);
                        });

                        row.ConstantItem(200).Column(c =>
                        {
                            c.Item().AlignRight().Text($"Invoice #: {dto.InvoiceNumber ?? "—"}").FontSize(10);
                            c.Item().AlignRight().Text($"Date: {(dto.InvoiceDate.HasValue ? dto.InvoiceDate.Value.ToString("yyyy-MM-dd") : "—")}").FontSize(10);
                            c.Item().AlignRight().Text($"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC").FontSize(8).FontColor(Colors.Grey.Darken1);
                        });
                    });

                    col.Item().PaddingTop(10).LineHorizontal(1).LineColor("#E5E7EB");
                });

                page.Content().PaddingTop(16).Column(col =>
                {
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(4);
                            columns.RelativeColumn(1);
                            columns.RelativeColumn(1.5f);
                            columns.RelativeColumn(1.5f);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Element(HeaderCell).Text("Description");
                            header.Cell().Element(HeaderCell).AlignRight().Text("Qty");
                            header.Cell().Element(HeaderCell).AlignRight().Text("Unit Price");
                            header.Cell().Element(HeaderCell).AlignRight().Text("Line Total");

                            static IContainer HeaderCell(IContainer c) => c
                                .DefaultTextStyle(x => x.SemiBold().FontColor(Colors.White))
                                .Background("#4338CA")
                                .Padding(6);
                        });

                        foreach (var item in dto.LineItems)
                        {
                            table.Cell().Element(BodyCell).Text(item.Description);
                            table.Cell().Element(BodyCell).AlignRight().Text(item.Quantity.ToString("0.##"));
                            table.Cell().Element(BodyCell).AlignRight().Text($"{dto.Currency} {item.UnitPrice:0.00}");
                            table.Cell().Element(BodyCell).AlignRight().Text($"{dto.Currency} {item.LineTotal:0.00}");

                            static IContainer BodyCell(IContainer c) => c
                                .BorderBottom(1).BorderColor("#E5E7EB")
                                .Padding(6);
                        }
                    });

                    col.Item().PaddingTop(16).AlignRight().Width(240).Column(c =>
                    {
                        c.Item().Row(r =>
                        {
                            r.RelativeItem().Text("Subtotal").FontColor(Colors.Grey.Darken1);
                            r.ConstantItem(120).AlignRight().Text($"{dto.Currency} {dto.Subtotal:0.00}");
                        });
                        c.Item().Row(r =>
                        {
                            r.RelativeItem().Text("Tax").FontColor(Colors.Grey.Darken1);
                            r.ConstantItem(120).AlignRight().Text($"{dto.Currency} {dto.TaxAmount:0.00}");
                        });
                        c.Item().PaddingTop(4).BorderTop(1).BorderColor("#111827").PaddingTop(6).Row(r =>
                        {
                            r.RelativeItem().Text("Total").Bold().FontSize(13);
                            r.ConstantItem(120).AlignRight().Text($"{dto.Currency} {dto.TotalAmount:0.00}").Bold().FontSize(13).FontColor("#4338CA");
                        });
                    });

                    if (!string.IsNullOrWhiteSpace(dto.ExtractionNotes))
                    {
                        col.Item().PaddingTop(20).Background("#FEF3C7").Padding(10).Text(text =>
                        {
                            text.Span("AI extraction note: ").SemiBold();
                            text.Span(dto.ExtractionNotes);
                        });
                    }
                });

                page.Footer().AlignCenter().Text("Generated by InvenAI — Invoice Extractor").FontSize(8).FontColor(Colors.Grey.Darken1);
            });
        }).GeneratePdf(stream);

        return stream.ToArray();
    }
}
