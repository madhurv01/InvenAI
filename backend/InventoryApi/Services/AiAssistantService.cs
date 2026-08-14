using System.Text;
using System.Text.Json;
using InventoryApi.DTOs;
using InventoryApi.Services.Interfaces;

namespace InventoryApi.Services;

/// <summary>
/// Simple AI chain:
///   User Question -> Intent Understanding -> .NET Inventory Service (controlled functions)
///   -> Supabase Data -> AI Response Generation -> Angular UI
///
/// The AI never executes arbitrary SQL. It only calls the whitelisted functions below,
/// then asks Claude to turn the structured result into a concise, business-friendly answer.
/// </summary>
public class AiAssistantService : IAiAssistantService
{
    private readonly IInventoryService _inventoryService;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<AiAssistantService> _logger;

    public AiAssistantService(
        IInventoryService inventoryService,
        IHttpClientFactory httpClientFactory,
        IConfiguration config,
        ILogger<AiAssistantService> logger)
    {
        _inventoryService = inventoryService;
        _httpClient = httpClientFactory.CreateClient("Anthropic");
        _config = config;
        _logger = logger;
    }

    public async Task<AiChatResponseDto> AskAsync(string question)
    {
        // Step 1: Intent understanding (lightweight keyword-based routing to controlled functions)
        var intent = ClassifyIntent(question);

        // Step 2: Call the appropriate controlled .NET inventory function (never raw SQL)
        object data = intent switch
        {
            "low_stock" => await _inventoryService.GetLowStockProductsAsync(),
            "recent_movements" => await _inventoryService.GetRecentStockMovementsAsync(10),
            "summary" => await _inventoryService.GetInventorySummaryAsync(),
            _ => await _inventoryService.GetInventorySummaryAsync() // default: general overview
        };

        // Step 3: Ask Claude to turn the structured data into a concise business answer
        var answer = await GenerateResponseAsync(question, intent, data);

        return new AiChatResponseDto
        {
            Answer = answer,
            Intent = intent,
            GeneratedAt = DateTime.UtcNow
        };
    }

    private static string ClassifyIntent(string question)
    {
        var q = question.ToLowerInvariant();

        if (q.Contains("low stock") || q.Contains("minimum") || q.Contains("running low") || q.Contains("need attention") || q.Contains("reorder") || q.Contains("restock"))
            return "low_stock";

        if (q.Contains("movement") || q.Contains("recent") || q.Contains("history") || q.Contains("stock-in") || q.Contains("stock-out") || q.Contains("transactions"))
            return "recent_movements";

        if (q.Contains("total") || q.Contains("value") || q.Contains("summary") || q.Contains("overview") || q.Contains("how many products"))
            return "summary";

        return "summary";
    }

    private async Task<string> GenerateResponseAsync(string question, string intent, object data)
    {
        var apiKey = _config["Anthropic:ApiKey"];
        var model = _config["Anthropic:Model"] ?? "claude-sonnet-4-6";
        var apiUrl = _config["Anthropic:ApiUrl"] ?? "https://api.anthropic.com/v1/messages";

        // Fallback: if no API key configured, produce a deterministic rule-based summary
        // so the feature still works out of the box during setup.
        if (string.IsNullOrWhiteSpace(apiKey) || apiKey.StartsWith("REPLACE_WITH"))
        {
            return BuildFallbackAnswer(intent, data);
        }

        var dataJson = JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = false });

        var systemPrompt =
            "You are an inventory management assistant embedded in a warehouse dashboard. " +
            "You are given real inventory data retrieved from the database via controlled backend functions. " +
            "Answer the user's question using ONLY the provided data. " +
            "Be concise (3-6 sentences or a short bullet list), business-oriented, and specific " +
            "(mention product names, SKUs, and quantities where relevant). " +
            "If the data shows no issues, say so plainly. Do not invent data that isn't present.";

        var userPrompt = $"User question: \"{question}\"\n\nInventory data (JSON):\n{dataJson}";

        var requestBody = new
        {
            model,
            max_tokens = 500,
            system = systemPrompt,
            messages = new[]
            {
                new { role = "user", content = userPrompt }
            }
        };

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, apiUrl);
            request.Headers.Add("x-api-key", apiKey);
            request.Headers.Add("anthropic-version", "2023-06-01");
            request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Anthropic API call failed: {Status} {Body}", response.StatusCode, responseBody);
                return BuildFallbackAnswer(intent, data);
            }

            using var doc = JsonDocument.Parse(responseBody);
            var textParts = new List<string>();
            if (doc.RootElement.TryGetProperty("content", out var contentArray))
            {
                foreach (var block in contentArray.EnumerateArray())
                {
                    if (block.TryGetProperty("type", out var type) && type.GetString() == "text"
                        && block.TryGetProperty("text", out var text))
                    {
                        textParts.Add(text.GetString() ?? string.Empty);
                    }
                }
            }

            var combined = string.Join("\n", textParts).Trim();
            return string.IsNullOrWhiteSpace(combined) ? BuildFallbackAnswer(intent, data) : combined;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling Anthropic API");
            return BuildFallbackAnswer(intent, data);
        }
    }

    // Deterministic fallback so the AI panel always works, even without an API key configured.
    private static string BuildFallbackAnswer(string intent, object data)
    {
        switch (intent)
        {
            case "low_stock" when data is List<InventoryItemDto> lowStock:
                if (lowStock.Count == 0)
                    return "All products are currently above their minimum stock levels. No restocking is needed right now.";
                var items = lowStock.Take(8).Select(i => $"- {i.ProductName} (SKU {i.Sku}) at {i.WarehouseName}: {i.QuantityOnHand} on hand, minimum is {i.MinimumStockLevel}");
                return $"{lowStock.Count} product(s) are at or below their minimum stock level:\n" + string.Join("\n", items);

            case "recent_movements" when data is List<StockMovementDto> movements:
                if (movements.Count == 0)
                    return "There is no recent stock movement history to report.";
                var moves = movements.Take(8).Select(m => $"- {m.MovementType} {m.Quantity} x {m.ProductName} ({m.Sku}) at {m.WarehouseName} on {m.CreatedAt:g}");
                return "Here are the most recent stock movements:\n" + string.Join("\n", moves);

            case "summary" when data is DashboardSummaryDto summary:
                return $"You currently have {summary.TotalProducts} products totaling {summary.TotalStockUnits} units on hand, " +
                       $"worth approximately {summary.TotalInventoryValue:C}. " +
                       $"{summary.LowStockCount} product(s) need attention because they are at or below their minimum stock level.";

            default:
                return "I couldn't determine a clear answer from the available inventory data. Try asking about low stock, recent movements, or an inventory summary.";
        }
    }
}
