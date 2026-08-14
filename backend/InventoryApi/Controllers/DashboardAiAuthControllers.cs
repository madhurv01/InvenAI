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
}

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class AiAssistantController : ControllerBase
{
    private readonly IAiAssistantService _aiAssistantService;

    public AiAssistantController(IAiAssistantService aiAssistantService)
    {
        _aiAssistantService = aiAssistantService;
    }

    /// <summary>
    /// AI chain: user question -> intent understanding -> controlled inventory functions
    /// -> Supabase data -> AI-generated natural language response.
    /// </summary>
    [HttpPost("ask")]
    public async Task<ActionResult<AiChatResponseDto>> Ask([FromBody] AiChatRequestDto dto)
    {
        var response = await _aiAssistantService.AskAsync(dto.Question);
        return Ok(response);
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
