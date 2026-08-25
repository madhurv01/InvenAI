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
public class PackageOrdersController : ControllerBase
{
    private readonly IPackageOrderService _packageOrderService;

    public PackageOrdersController(IPackageOrderService packageOrderService)
    {
        _packageOrderService = packageOrderService;
    }

    /// <summary>Create a package order: picks a warehouse + products (each optionally "tallied" with a customization note), validates stock, and deducts it immediately as an OUT movement.</summary>
    [HttpPost]
    public async Task<ActionResult<PackageOrderDetailDto>> Create([FromBody] CreatePackageOrderDto dto)
    {
        return Ok(await _packageOrderService.CreateAsync(dto, GetUserId()));
    }

    [HttpGet]
    public async Task<ActionResult<List<PackageOrderSummaryDto>>> GetAll()
    {
        return Ok(await _packageOrderService.GetAllAsync());
    }

    /// <summary>Slim list of Pending orders — used by the New Shipment page's "link a package order" picker.</summary>
    [HttpGet("pending")]
    public async Task<ActionResult<List<PackageOrderPendingDto>>> GetPending()
    {
        return Ok(await _packageOrderService.GetPendingAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PackageOrderDetailDto>> GetById(Guid id)
    {
        return Ok(await _packageOrderService.GetByIdAsync(id));
    }

    /// <summary>Cancel a Pending package order — restocks everything it reserved.</summary>
    [HttpPatch("{id:guid}/cancel")]
    public async Task<ActionResult<PackageOrderDetailDto>> Cancel(Guid id)
    {
        return Ok(await _packageOrderService.CancelAsync(id));
    }

    private Guid? GetUserId()
    {
        var value = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out var id) ? id : null;
    }
}
