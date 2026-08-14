using InventoryApi.DTOs;
using InventoryApi.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventoryApi.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;

    public InventoryController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    /// <summary>Current stock levels, optionally filtered by product, warehouse, or low-stock only.</summary>
    [HttpGet("stock")]
    public async Task<ActionResult<List<InventoryItemDto>>> GetStock(
        [FromQuery] Guid? productId,
        [FromQuery] Guid? warehouseId,
        [FromQuery] bool? lowStockOnly)
    {
        return Ok(await _inventoryService.GetStockAsync(productId, warehouseId, lowStockOnly));
    }

    [HttpGet("warehouses")]
    public async Task<ActionResult<List<WarehouseDto>>> GetWarehouses()
    {
        return Ok(await _inventoryService.GetWarehousesAsync());
    }

    /// <summary>Record a stock-in, stock-out, or manual adjustment. Always writes a movement history entry.</summary>
    [HttpPost("movements")]
    public async Task<ActionResult<StockMovementDto>> RecordMovement([FromBody] CreateStockMovementDto dto)
    {
        var movement = await _inventoryService.RecordMovementAsync(dto);
        return CreatedAtAction(nameof(GetMovementHistory), new { }, movement);
    }

    [HttpGet("movements")]
    public async Task<ActionResult<List<StockMovementDto>>> GetMovementHistory(
        [FromQuery] Guid? productId,
        [FromQuery] Guid? warehouseId,
        [FromQuery] int take = 50)
    {
        return Ok(await _inventoryService.GetMovementHistoryAsync(productId, warehouseId, take));
    }
}
