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
public class WorkflowsController : ControllerBase
{
    private readonly IWorkflowService _workflowService;

    public WorkflowsController(IWorkflowService workflowService)
    {
        _workflowService = workflowService;
    }

    [HttpPost("alert")]
    public async Task<ActionResult<WorkflowDetailDto>> CreateAlert([FromBody] CreateAlertWorkflowDto dto)
    {
        return Ok(await _workflowService.CreateAlertAsync(dto, GetUserId()));
    }

    [HttpPost("trigger")]
    public async Task<ActionResult<WorkflowDetailDto>> CreateTrigger([FromBody] CreateTriggerWorkflowDto dto)
    {
        return Ok(await _workflowService.CreateTriggerAsync(dto, GetUserId()));
    }

    [HttpPost("supplychain")]
    public async Task<ActionResult<WorkflowDetailDto>> CreateSupplyChain([FromBody] CreateSupplyChainWorkflowDto dto)
    {
        return Ok(await _workflowService.CreateSupplyChainAsync(dto, GetUserId()));
    }

    [HttpGet]
    public async Task<ActionResult<List<WorkflowSummaryDto>>> GetAll()
    {
        return Ok(await _workflowService.GetAllAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WorkflowDetailDto>> GetById(Guid id)
    {
        return Ok(await _workflowService.GetByIdAsync(id));
    }

    [HttpPatch("{id:guid}/pause")]
    public async Task<ActionResult<WorkflowDetailDto>> Pause(Guid id)
    {
        return Ok(await _workflowService.PauseAsync(id));
    }

    [HttpPatch("{id:guid}/resume")]
    public async Task<ActionResult<WorkflowDetailDto>> Resume(Guid id)
    {
        return Ok(await _workflowService.ResumeAsync(id));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _workflowService.DeleteAsync(id);
        return NoContent();
    }

    private Guid? GetUserId()
    {
        var value = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out var id) ? id : null;
    }
}
