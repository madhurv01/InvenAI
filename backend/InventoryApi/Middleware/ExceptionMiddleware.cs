using System.Net;
using System.Text.Json;
using InventoryApi.DTOs;

namespace InventoryApi.Middleware;

public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }
}

public class BadRequestException : Exception
{
    public BadRequestException(string message) : base(message) { }
}

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        context.Response.ContentType = "application/json";

        var statusCode = ex switch
        {
            NotFoundException => HttpStatusCode.NotFound,
            BadRequestException => HttpStatusCode.BadRequest,
            UnauthorizedAccessException => HttpStatusCode.Unauthorized,
            _ => HttpStatusCode.InternalServerError
        };

        if (statusCode == HttpStatusCode.InternalServerError)
        {
            _logger.LogError(ex, "Unhandled exception occurred");
        }
        else
        {
            _logger.LogWarning(ex, "Handled exception occurred: {Message}", ex.Message);
        }

        context.Response.StatusCode = (int)statusCode;

        var response = new ApiErrorResponse
        {
            Message = ex.Message,
            StatusCode = (int)statusCode,
            Detail = statusCode == HttpStatusCode.InternalServerError ? "An unexpected error occurred." : null
        };

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        await context.Response.WriteAsync(json);
    }
}
