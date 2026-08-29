using System.Text;
using System.Text.Json;
using InventoryApi.Data;
using InventoryApi.DTOs;
using InventoryApi.Middleware;
using InventoryApi.Models;
using InventoryApi.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace InventoryApi.Services;

/// <summary>
/// Chat chain: User question -> free open-source LLM (via Groq's fast inference API) generates
/// a read-only SQL query against the known schema -> query is validated and run against
/// Supabase Postgres -> the LLM turns the row results into a concise natural-language answer.
/// </summary>
public class ChatService : IChatService
{
    private readonly InventoryDbContext _db;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<ChatService> _logger;
    private readonly string _connectionString;

    private const string Schema = @"
categories(id uuid, name text, description text, created_at timestamptz)
suppliers(id uuid, name text, contact_person text, email text, phone text, address text, lead_time_days int, is_active bool, created_at timestamptz, updated_at timestamptz)
warehouses(id uuid, name text, location text, is_active bool, created_at timestamptz)
products(id uuid, name text, sku text, category_id uuid, supplier_id uuid, unit_price numeric, minimum_stock_level int, status text, created_at timestamptz, updated_at timestamptz)
inventory(id uuid, product_id uuid, warehouse_id uuid, quantity_on_hand int, updated_at timestamptz)
stock_movements(id uuid, product_id uuid, warehouse_id uuid, movement_type text, quantity int, reason text, reference_no text, performed_by text, created_at timestamptz)";

    private static readonly string[] ForbiddenKeywords =
    {
        "insert", "update", "delete", "drop", "alter", "truncate", "grant", "revoke",
        "create", "copy", "call", "do", "vacuum", "reindex", "--", "/*", ";"
    };

    public ChatService(
        InventoryDbContext db,
        IHttpClientFactory httpClientFactory,
        IConfiguration config,
        ILogger<ChatService> logger)
    {
        _db = db;
        _httpClient = httpClientFactory.CreateClient("Groq");
        _config = config;
        _logger = logger;
        _connectionString = config.GetConnectionString("SupabaseConnection")!;
    }

    public async Task<ChatResponseDto> AskAsync(Guid userId, string question, Guid? conversationId)
    {
        var conversation = conversationId.HasValue
            ? await _db.ChatConversations.FirstOrDefaultAsync(c => c.Id == conversationId.Value && c.UserId == userId)
                ?? throw new NotFoundException("Conversation not found.")
            : new ChatConversation
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Title = BuildTitle(question),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

        if (!conversationId.HasValue)
            _db.ChatConversations.Add(conversation);

        _db.ChatMessages.Add(new ChatMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversation.Id,
            Role = "user",
            Content = question,
            CreatedAt = DateTime.UtcNow
        });

        var (answer, sql) = await AnswerQuestionAsync(question);

        conversation.UpdatedAt = DateTime.UtcNow;
        _db.ChatMessages.Add(new ChatMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversation.Id,
            Role = "assistant",
            Content = answer,
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return new ChatResponseDto
        {
            ConversationId = conversation.Id,
            Answer = answer,
            Sql = sql
        };
    }

    public async Task<List<ChatConversationSummaryDto>> GetConversationsAsync(Guid userId)
    {
        return await _db.ChatConversations
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.UpdatedAt)
            .Select(c => new ChatConversationSummaryDto { Id = c.Id, Title = c.Title, UpdatedAt = c.UpdatedAt })
            .ToListAsync();
    }

    public async Task<ChatConversationDetailDto> GetConversationAsync(Guid userId, Guid conversationId)
    {
        var conversation = await _db.ChatConversations
            .AsNoTracking()
            .Include(c => c.Messages)
            .FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId)
            ?? throw new NotFoundException("Conversation not found.");

        return new ChatConversationDetailDto
        {
            Id = conversation.Id,
            Title = conversation.Title,
            Messages = conversation.Messages
                .OrderBy(m => m.CreatedAt)
                .Select(m => new ChatMessageDto { Role = m.Role, Content = m.Content, CreatedAt = m.CreatedAt })
                .ToList()
        };
    }

    public async Task DeleteConversationAsync(Guid userId, Guid conversationId)
    {
        var conversation = await _db.ChatConversations
            .FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId)
            ?? throw new NotFoundException("Conversation not found.");

        _db.ChatConversations.Remove(conversation);
        await _db.SaveChangesAsync();
    }

    private static string BuildTitle(string question)
    {
        var trimmed = question.Trim();
        return trimmed.Length <= 60 ? trimmed : trimmed[..57] + "...";
    }

    private async Task<(string Answer, string? Sql)> AnswerQuestionAsync(string question)
    {
        var sql = await GenerateSqlAsync(question);

        if (string.IsNullOrWhiteSpace(sql) || !IsSafeSelect(sql))
        {
            return ("I couldn't turn that into a safe query against the inventory data. Try rephrasing, e.g. \"which products are low on stock?\" or \"total inventory value by category\".", sql);
        }

        List<Dictionary<string, object?>> rows;
        try
        {
            rows = await RunReadOnlyQueryAsync(sql);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Generated SQL failed to execute: {Sql}", sql);
            return ("I generated a query but it failed to run against the database. Could you rephrase the question?", sql);
        }

        return (await SummarizeResultsAsync(question, sql, rows), sql);
    }

    private async Task<string> GenerateSqlAsync(string question)
    {
        const string systemPrompt =
            "You are a PostgreSQL expert. Write ONE read-only PostgreSQL SELECT statement that answers " +
            "the user's question, using ONLY the given schema. Rules: only SELECT, no semicolons, no comments, " +
            "no data-changing statements, always add a reasonable LIMIT (max 50) unless the question asks for " +
            "a single aggregate value. Return ONLY the raw SQL, nothing else, no markdown, no explanation.";

        var userPrompt = $"Schema:\n{Schema}\n\nQuestion: {question}\n\nSQL:";

        var raw = await CallGroqAsync(systemPrompt, userPrompt, temperature: 0.1);
        return ExtractSql(raw);
    }

    private async Task<string> SummarizeResultsAsync(string question, string sql, List<Dictionary<string, object?>> rows)
    {
        var rowsJson = JsonSerializer.Serialize(rows.Take(50), new JsonSerializerOptions { WriteIndented = false });

        const string systemPrompt =
            "You are an inventory management assistant embedded in a warehouse dashboard. " +
            "Answer the user's question using ONLY the provided query result data. " +
            "Be concise (2-6 sentences or a short bullet list), business-oriented, and specific " +
            "(mention product names, SKUs, and quantities where relevant). " +
            "If the result set is empty, say so plainly. Do not invent data that isn't present. " +
            "Do not mention SQL or databases in your answer.";

        var userPrompt = $"User question: \"{question}\"\n\nQuery result (JSON rows):\n{rowsJson}\n\nAnswer:";

        var answer = StripThinking(await CallGroqAsync(systemPrompt, userPrompt, temperature: 0.3));
        return string.IsNullOrWhiteSpace(answer)
            ? BuildFallbackAnswer(rows)
            : answer.Trim();
    }

    // Defensive: strips a <think>...</think> block if a reasoning model ever emits one
    // despite reasoning_effort:none (e.g. after a model change in config).
    private static string StripThinking(string text)
    {
        var end = text.IndexOf("</think>", StringComparison.OrdinalIgnoreCase);
        return end >= 0 ? text[(end + "</think>".Length)..] : text;
    }

    private async Task<string> CallGroqAsync(string systemPrompt, string userPrompt, double temperature)
    {
        var apiKey = _config["Groq:ApiKey"];
        var model = _config["Groq:ChatModel"] ?? "qwen/qwen3.6-27b";
        var apiUrl = _config["Groq:ApiUrl"] ?? "https://api.groq.com/openai/v1/chat/completions";

        if (string.IsNullOrWhiteSpace(apiKey) || apiKey.StartsWith("REPLACE_WITH"))
        {
            _logger.LogWarning("Groq:ApiKey is not configured — Chat cannot run without it.");
            return string.Empty;
        }

        var requestBody = new
        {
            model,
            temperature,
            reasoning_effort = "none", // qwen3.6 is a reasoning model; skip the <think> pass for low-latency answers
            messages = new[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt }
            }
        };

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, apiUrl);
            request.Headers.Add("Authorization", $"Bearer {apiKey}");
            request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Groq chat call failed: {Status} {Body}", response.StatusCode, responseBody);
                return string.Empty;
            }

            using var doc = JsonDocument.Parse(responseBody);
            var choices = doc.RootElement.GetProperty("choices");
            if (choices.GetArrayLength() == 0) return string.Empty;

            return choices[0].GetProperty("message").GetProperty("content").GetString() ?? string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling Groq API");
            return string.Empty;
        }
    }

    private static string ExtractSql(string raw)
    {
        var text = StripThinking(raw).Trim();
        text = text.Replace("```sql", "").Replace("```", "").Trim();

        var selectIndex = text.IndexOf("select", StringComparison.OrdinalIgnoreCase);
        if (selectIndex > 0) text = text[selectIndex..];

        return text.TrimEnd(';', ' ', '\n', '\r');
    }

    private static bool IsSafeSelect(string sql)
    {
        var trimmed = sql.Trim();
        if (!trimmed.StartsWith("select", StringComparison.OrdinalIgnoreCase)) return false;

        var lower = trimmed.ToLowerInvariant();
        return !ForbiddenKeywords.Any(kw => lower.Contains(kw));
    }

    private async Task<List<Dictionary<string, object?>>> RunReadOnlyQueryAsync(string sql)
    {
        var results = new List<Dictionary<string, object?>>();

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var tx = await connection.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted);
        await using (var timeoutCmd = new NpgsqlCommand("SET LOCAL statement_timeout = '5s'", connection, tx))
        {
            await timeoutCmd.ExecuteNonQueryAsync();
        }

        await using (var cmd = new NpgsqlCommand(sql, connection, tx))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                var row = new Dictionary<string, object?>();
                for (var i = 0; i < reader.FieldCount; i++)
                {
                    var value = await reader.IsDBNullAsync(i) ? null : reader.GetValue(i);
                    row[reader.GetName(i)] = value;
                }
                results.Add(row);
            }
        }

        // Reader is closed at this point, so the transaction can be safely rolled back
        // (no writes are ever executed, this only releases the read-only snapshot).
        await tx.RollbackAsync();
        return results;
    }

    private static string BuildFallbackAnswer(List<Dictionary<string, object?>> rows)
    {
        if (rows.Count == 0)
            return "I ran the query but found no matching data.";

        return $"Found {rows.Count} result(s), but I couldn't reach the AI model to summarize them. Please try again.";
    }
}
