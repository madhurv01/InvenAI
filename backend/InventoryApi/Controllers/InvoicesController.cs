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
public class InvoicesController : ControllerBase
{
    private readonly IInvoiceExtractionService _invoiceService;

    public InvoicesController(IInvoiceExtractionService invoiceService)
    {
        _invoiceService = invoiceService;
    }

    /// <summary>Send a photographed/uploaded invoice image to Claude vision for structured data extraction.</summary>
    [HttpPost("extract")]
    public async Task<ActionResult<ExtractedInvoiceDto>> Extract([FromBody] ExtractInvoiceRequestDto request)
    {
        var extracted = await _invoiceService.ExtractAsync(request);
        return Ok(extracted);
    }

    /// <summary>Generate a formatted PDF from the (possibly user-corrected) extracted data and store it.</summary>
    [HttpPost]
    public async Task<ActionResult<InvoiceSummaryDto>> Save([FromBody] SaveInvoiceRequestDto dto)
    {
        var userId = GetUserId();
        var saved = await _invoiceService.SaveAsync(dto, userId);
        return Ok(saved);
    }

    [HttpGet]
    public async Task<ActionResult<List<InvoiceSummaryDto>>> GetAll()
    {
        return Ok(await _invoiceService.GetAllAsync());
    }

    [HttpGet("{id:guid}/pdf")]
    public async Task<IActionResult> GetPdf(Guid id)
    {
        var (data, fileName) = await _invoiceService.GetPdfAsync(id);
        return File(data, "application/pdf", fileName);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _invoiceService.DeleteAsync(id);
        return NoContent();
    }

    private Guid? GetUserId()
    {
        var value = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out var id) ? id : null;
    }
}
