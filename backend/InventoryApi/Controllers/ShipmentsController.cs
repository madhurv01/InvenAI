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
public class ShipmentsController : ControllerBase
{
    private readonly IShipmentService _shipmentService;

    public ShipmentsController(IShipmentService shipmentService)
    {
        _shipmentService = shipmentService;
    }

    /// <summary>Create a shipment order — fetches the real road route/distance/ETA from OSRM and starts live tracking immediately.</summary>
    [HttpPost]
    public async Task<ActionResult<ShipmentDetailDto>> Create([FromBody] CreateShipmentDto dto)
    {
        var created = await _shipmentService.CreateAsync(dto, GetUserId());
        return Ok(created);
    }

    [HttpGet]
    public async Task<ActionResult<List<ShipmentSummaryDto>>> GetAll()
    {
        return Ok(await _shipmentService.GetAllAsync());
    }

    /// <summary>Full shipment detail including the route geometry for map rendering and live progress.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ShipmentDetailDto>> GetById(Guid id)
    {
        return Ok(await _shipmentService.GetByIdAsync(id));
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<ShipmentDetailDto>> UpdateStatus(Guid id, [FromBody] UpdateShipmentStatusDto dto)
    {
        return Ok(await _shipmentService.UpdateStatusAsync(id, dto.Status));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _shipmentService.DeleteAsync(id);
        return NoContent();
    }

    private Guid? GetUserId()
    {
        var value = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out var id) ? id : null;
    }
}
