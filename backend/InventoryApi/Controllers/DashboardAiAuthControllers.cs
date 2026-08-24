using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using InventoryApi.DTOs;
using InventoryApi.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventoryApi.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    /// <summary>Total products, total inventory value, low-stock products, recent movements, category breakdown.</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary()
    {
        return Ok(await _dashboardService.GetSummaryAsync());
    }

    /// <summary>Warehouse x category stock heatmap, 14-day movement trend, stock status breakdown, top-value categories.</summary>
    [HttpGet("analytics")]
    public async Task<ActionResult<DashboardAnalyticsDto>> GetAnalytics()
    {
        return Ok(await _dashboardService.GetAnalyticsAsync());
    }
}

[ApiController]
[Authorize]
[Route("api/chat")]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;

    public ChatController(IChatService chatService)
    {
        _chatService = chatService;
    }

    /// <summary>
    /// Chat chain: user question -> LLM generates read-only SQL -> Supabase data
    /// -> LLM turns the results into a natural language response. Persists both the
    /// question and answer to the (new or existing) conversation for history.
    /// </summary>
    [HttpPost("ask")]
    public async Task<ActionResult<ChatResponseDto>> Ask([FromBody] ChatRequestDto dto)
    {
        var response = await _chatService.AskAsync(GetUserId(), dto.Question, dto.ConversationId);
        return Ok(response);
    }

    /// <summary>List this user's past conversations, most recently updated first.</summary>
    [HttpGet("conversations")]
    public async Task<ActionResult<List<ChatConversationSummaryDto>>> GetConversations()
    {
        return Ok(await _chatService.GetConversationsAsync(GetUserId()));
    }

    /// <summary>Full message history for one conversation.</summary>
    [HttpGet("conversations/{id:guid}")]
    public async Task<ActionResult<ChatConversationDetailDto>> GetConversation(Guid id)
    {
        return Ok(await _chatService.GetConversationAsync(GetUserId(), id));
    }

    [HttpDelete("conversations/{id:guid}")]
    public async Task<IActionResult> DeleteConversation(Guid id)
    {
        await _chatService.DeleteConversationAsync(GetUserId(), id);
        return NoContent();
    }

    private Guid GetUserId()
    {
        var value = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out var id) ? id : throw new UnauthorizedAccessException("Invalid user token.");
    }
}

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterRequestDto dto)
    {
        return Ok(await _authService.RegisterAsync(dto));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginRequestDto dto)
    {
        return Ok(await _authService.LoginAsync(dto));
    }
}
