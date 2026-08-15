using InventoryApi.DTOs;
using InventoryApi.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventoryApi.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class WarehousesController : ControllerBase
{
    private readonly IWarehouseService _warehouseService;

    public WarehousesController(IWarehouseService warehouseService)
    {
        _warehouseService = warehouseService;
    }

    [HttpGet]
    public async Task<ActionResult<List<WarehouseManageDto>>> GetAll()
    {
        return Ok(await _warehouseService.GetAllAsync());
    }

    [HttpPost]
    public async Task<ActionResult<WarehouseManageDto>> Create([FromBody] CreateWarehouseDto dto)
    {
        var created = await _warehouseService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetAll), created);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WarehouseManageDto>> Update(Guid id, [FromBody] UpdateWarehouseDto dto)
    {
        return Ok(await _warehouseService.UpdateAsync(id, dto));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _warehouseService.DeleteAsync(id);
        return NoContent();
    }
}
