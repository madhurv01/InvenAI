using InventoryApi.Data;
using InventoryApi.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventoryApi.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly InventoryDbContext _db;

    public CategoriesController(InventoryDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<CategoryDto>>> GetAll()
    {
        var categories = await _db.Categories
            .OrderBy(c => c.Name)
            .Select(c => new CategoryDto { Id = c.Id, Name = c.Name })
            .ToListAsync();

        return Ok(categories);
    }
}
