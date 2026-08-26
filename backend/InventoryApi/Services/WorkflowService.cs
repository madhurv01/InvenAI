using System.Text.Json;
using InventoryApi.Data;
using InventoryApi.DTOs;
using InventoryApi.Middleware;
using InventoryApi.Models;
using InventoryApi.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InventoryApi.Services;

/// <summary>
/// Creates and manages the three Automate Workflow types (Alert, Trigger, SupplyChain).
/// Each workflow's type-specific parameters are captured once at creation time into a JSON
/// "config" blob; the actual periodic checking/acting happens in WorkflowExecutionService,
/// a background service that reads Active workflows and mutates a separate JSON "state" blob
/// for dedup bookkeeping (so the same email doesn't fire every polling cycle).
/// </summary>
public class WorkflowService : IWorkflowService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private readonly InventoryDbContext _db;

    public WorkflowService(InventoryDbContext db)
    {
        _db = db;
    }

    public async Task<WorkflowDetailDto> CreateAlertAsync(CreateAlertWorkflowDto dto, Guid? userId)
    {
        var warehouse = await _db.Warehouses.FirstOrDefaultAsync(w => w.Id == dto.WarehouseId)
            ?? throw new NotFoundException("Warehouse not found.");

        Product? product = null;
        if (dto.ProductId.HasValue)
        {
            product = await _db.Products.FirstOrDefaultAsync(p => p.Id == dto.ProductId.Value)
                ?? throw new NotFoundException("Product not found.");
        }

        var config = new Dictionary<string, object?>
        {
            ["warehouseId"] = dto.WarehouseId,
            ["warehouseName"] = warehouse.Name,
            ["productId"] = dto.ProductId,
            ["productName"] = product?.Name,
            ["thresholdQuantity"] = dto.ThresholdQuantity,
            ["recipientEmail"] = dto.RecipientEmail
        };

        var workflow = await CreateAsync("Alert", dto.Name, config, userId);
        return ToDetailDto(workflow);
    }

    public async Task<WorkflowDetailDto> CreateTriggerAsync(CreateTriggerWorkflowDto dto, Guid? userId)
    {
        var packageOrder = await _db.PackageOrders.FirstOrDefaultAsync(o => o.Id == dto.PackageOrderId)
            ?? throw new NotFoundException("Package order not found.");

        if (packageOrder.Status != "Pending")
            throw new BadRequestException($"Package order {packageOrder.OrderNumber} is already {packageOrder.Status}.");

        if (dto.ScheduledAt <= DateTime.UtcNow)
            throw new BadRequestException("Scheduled ship time must be in the future.");

        var config = new Dictionary<string, object?>
        {
            ["packageOrderId"] = dto.PackageOrderId,
            ["packageOrderNumber"] = packageOrder.OrderNumber,
            ["scheduledAt"] = dto.ScheduledAt,
            ["originName"] = dto.OriginName,
            ["originLat"] = dto.OriginLat,
            ["originLng"] = dto.OriginLng,
            ["destinationName"] = dto.DestinationName,
            ["destinationLat"] = dto.DestinationLat,
            ["destinationLng"] = dto.DestinationLng,
            ["recipientEmail"] = dto.RecipientEmail
        };

        var workflow = await CreateAsync("Trigger", dto.Name, config, userId);
        return ToDetailDto(workflow);
    }

    public async Task<WorkflowDetailDto> CreateSupplyChainAsync(CreateSupplyChainWorkflowDto dto, Guid? userId)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == dto.ProductId)
            ?? throw new NotFoundException("Product not found.");
        var warehouse = await _db.Warehouses.FirstOrDefaultAsync(w => w.Id == dto.WarehouseId)
            ?? throw new NotFoundException("Warehouse not found.");

        var config = new Dictionary<string, object?>
        {
            ["productId"] = dto.ProductId,
            ["productName"] = product.Name,
            ["warehouseId"] = dto.WarehouseId,
            ["warehouseName"] = warehouse.Name,
            ["thresholdQuantity"] = dto.ThresholdQuantity,
            ["recipientEmail"] = dto.RecipientEmail
        };

        var workflow = await CreateAsync("SupplyChain", dto.Name, config, userId);
        return ToDetailDto(workflow);
    }

    private async Task<Workflow> CreateAsync(string type, string name, Dictionary<string, object?> config, Guid? userId)
    {
        var now = DateTime.UtcNow;
        var workflow = new Workflow
        {
            Id = Guid.NewGuid(),
            Type = type,
            Name = name,
            Status = "Active",
            Config = JsonSerializer.Serialize(config, JsonOptions),
            State = "{}",
            CreatedBy = userId,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Workflows.Add(workflow);
        _db.WorkflowEvents.Add(new WorkflowEvent
        {
            Id = Guid.NewGuid(),
            WorkflowId = workflow.Id,
            EventType = "Created",
            Message = $"{type} workflow \"{name}\" created and activated.",
            CreatedAt = now
        });

        await _db.SaveChangesAsync();
        return workflow;
    }

    public async Task<List<WorkflowSummaryDto>> GetAllAsync()
    {
        var workflows = await _db.Workflows.AsNoTracking().OrderByDescending(w => w.CreatedAt).ToListAsync();
        return workflows.Select(w => new WorkflowSummaryDto
        {
            Id = w.Id,
            Type = w.Type,
            Name = w.Name,
            Status = w.Status,
            Summary = BuildSummaryLine(w),
            CreatedAt = w.CreatedAt,
            LastRunAt = w.LastRunAt,
            LastTriggeredAt = w.LastTriggeredAt
        }).ToList();
    }

    public async Task<WorkflowDetailDto> GetByIdAsync(Guid id)
    {
        var workflow = await _db.Workflows
            .AsNoTracking()
            .Include(w => w.Events)
            .FirstOrDefaultAsync(w => w.Id == id)
            ?? throw new NotFoundException("Workflow not found.");

        return ToDetailDto(workflow);
    }

    public async Task<WorkflowDetailDto> PauseAsync(Guid id)
    {
        var workflow = await _db.Workflows.FirstOrDefaultAsync(w => w.Id == id)
            ?? throw new NotFoundException("Workflow not found.");

        if (workflow.Status != "Active")
            throw new BadRequestException($"Only Active workflows can be paused (this one is {workflow.Status}).");

        workflow.Status = "Paused";
        workflow.UpdatedAt = DateTime.UtcNow;
        AddEvent(workflow.Id, "Paused", "Workflow paused by user.");
        await _db.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<WorkflowDetailDto> ResumeAsync(Guid id)
    {
        var workflow = await _db.Workflows.FirstOrDefaultAsync(w => w.Id == id)
            ?? throw new NotFoundException("Workflow not found.");

        if (workflow.Status != "Paused")
            throw new BadRequestException($"Only Paused workflows can be resumed (this one is {workflow.Status}).");

        workflow.Status = "Active";
        workflow.UpdatedAt = DateTime.UtcNow;
        AddEvent(workflow.Id, "Resumed", "Workflow resumed by user.");
        await _db.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task DeleteAsync(Guid id)
    {
        var workflow = await _db.Workflows.FirstOrDefaultAsync(w => w.Id == id)
            ?? throw new NotFoundException("Workflow not found.");

        _db.Workflows.Remove(workflow);
        await _db.SaveChangesAsync();
    }

    private void AddEvent(Guid workflowId, string eventType, string message)
    {
        _db.WorkflowEvents.Add(new WorkflowEvent
        {
            Id = Guid.NewGuid(),
            WorkflowId = workflowId,
            EventType = eventType,
            Message = message,
            CreatedAt = DateTime.UtcNow
        });
    }

    private static string BuildSummaryLine(Workflow w)
    {
        try
        {
            using var doc = JsonDocument.Parse(w.Config);
            var root = doc.RootElement;
            return w.Type switch
            {
                "Alert" => root.TryGetProperty("productName", out var pn) && pn.ValueKind == JsonValueKind.String
                    ? $"{pn.GetString()} at {root.GetProperty("warehouseName").GetString()} < {root.GetProperty("thresholdQuantity").GetInt32()} units"
                    : $"Any product at {root.GetProperty("warehouseName").GetString()} < {root.GetProperty("thresholdQuantity").GetInt32()} units",
                "Trigger" => $"Ship {root.GetProperty("packageOrderNumber").GetString()} at {DateTime.Parse(root.GetProperty("scheduledAt").GetString()!):MMM d, h:mm a}",
                "SupplyChain" => $"Monitor {root.GetProperty("productName").GetString()} at {root.GetProperty("warehouseName").GetString()}",
                _ => w.Name
            };
        }
        catch
        {
            return w.Name;
        }
    }

    private static WorkflowDetailDto ToDetailDto(Workflow w)
    {
        var config = JsonSerializer.Deserialize<Dictionary<string, object?>>(w.Config, JsonOptions) ?? new();

        // Surface a couple of useful runtime facts from `state` alongside the static config,
        // so the detail page can show e.g. which shipment a Trigger workflow ended up creating.
        try
        {
            using var stateDoc = JsonDocument.Parse(w.State);
            if (stateDoc.RootElement.TryGetProperty("shipmentId", out var sid))
                config["shipmentId"] = sid.GetString();
            if (stateDoc.RootElement.TryGetProperty("shipmentOrderNumber", out var son))
                config["shipmentOrderNumber"] = son.GetString();
        }
        catch { /* state may be "{}" or malformed from a partial run — config still renders fine */ }

        return new WorkflowDetailDto
        {
            Id = w.Id,
            Type = w.Type,
            Name = w.Name,
            Status = w.Status,
            Config = config,
            Events = w.Events
                .OrderByDescending(e => e.CreatedAt)
                .Select(e => new WorkflowEventDto { EventType = e.EventType, Message = e.Message, CreatedAt = e.CreatedAt })
                .ToList(),
            CreatedAt = w.CreatedAt,
            LastRunAt = w.LastRunAt,
            LastTriggeredAt = w.LastTriggeredAt
        };
    }
}
