using System.Text.Json;
using System.Text.Json.Serialization;
using InventoryApi.Data;
using InventoryApi.DTOs;
using InventoryApi.Middleware;
using InventoryApi.Models;
using InventoryApi.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InventoryApi.Services;

// ---------- Typed state shapes (serialized into Workflow.State as JSON) ----------

internal class AlertState
{
    /// <summary>Product id (string) -> currently-below-threshold flag, so an email only fires on the transition into breach, not every polling cycle.</summary>
    public Dictionary<string, bool> Breached { get; set; } = new();
}

internal class TriggerState
{
    public Guid? ShipmentId { get; set; }
    public string? ShipmentOrderNumber { get; set; }
    public bool Reported { get; set; }
}

internal class SupplyChainState
{
    public bool Breached { get; set; }
    public List<string> NotifiedShipmentIds { get; set; } = new();
}

/// <summary>
/// Polls all Active workflows every few minutes and executes whichever type-specific check
/// applies: Alert (stock threshold -> email), Trigger (scheduled auto-shipment + completion
/// report email), SupplyChain (combined stock + shipment-status monitoring for one product at
/// one warehouse). Runs in-process inside the API — no separate job infrastructure needed.
/// </summary>
public class WorkflowExecutionService : BackgroundService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<WorkflowExecutionService> _logger;
    private readonly TimeSpan _interval;

    public WorkflowExecutionService(IServiceScopeFactory scopeFactory, IConfiguration config, ILogger<WorkflowExecutionService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        var minutes = int.TryParse(config["Workflows:PollingIntervalMinutes"], out var m) ? m : 3;
        _interval = TimeSpan.FromMinutes(Math.Max(1, minutes));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Small initial delay so this doesn't compete with app startup.
        await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

        using var timer = new PeriodicTimer(_interval);
        do
        {
            try
            {
                await RunAllAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Workflow execution cycle failed unexpectedly");
            }
        } while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task RunAllAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();

        var active = await db.Workflows.Where(w => w.Status == "Active").ToListAsync(ct);
        if (active.Count == 0) return;

        var email = scope.ServiceProvider.GetRequiredService<IEmailService>();
        var shipmentService = scope.ServiceProvider.GetRequiredService<IShipmentService>();

        foreach (var workflow in active)
        {
            try
            {
                switch (workflow.Type)
                {
                    case "Alert":
                        await RunAlertAsync(db, email, workflow);
                        break;
                    case "Trigger":
                        await RunTriggerAsync(db, email, shipmentService, workflow);
                        break;
                    case "SupplyChain":
                        await RunSupplyChainAsync(db, email, workflow);
                        break;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Workflow {Id} ({Type}) execution failed", workflow.Id, workflow.Type);
                db.WorkflowEvents.Add(new WorkflowEvent
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = workflow.Id,
                    EventType = "Error",
                    Message = $"Execution error: {ex.Message}",
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        await db.SaveChangesAsync(ct);
    }

    // ---------- Alert ----------

    private static async Task RunAlertAsync(InventoryDbContext db, IEmailService email, Workflow workflow)
    {
        var config = JsonSerializer.Deserialize<JsonElement>(workflow.Config, JsonOptions);
        var warehouseId = config.GetProperty("warehouseId").GetGuid();
        var warehouseName = config.GetProperty("warehouseName").GetString() ?? "";
        var threshold = config.GetProperty("thresholdQuantity").GetInt32();
        var recipient = config.GetProperty("recipientEmail").GetString()!;
        Guid? scopedProductId = config.TryGetProperty("productId", out var pidEl) && pidEl.ValueKind == JsonValueKind.String
            ? Guid.Parse(pidEl.GetString()!) : null;

        var state = DeserializeState<AlertState>(workflow.State);

        var query = db.Inventory.Include(i => i.Product).Where(i => i.WarehouseId == warehouseId);
        if (scopedProductId.HasValue) query = query.Where(i => i.ProductId == scopedProductId.Value);
        var rows = await query.ToListAsync();

        var now = DateTime.UtcNow;
        foreach (var row in rows)
        {
            var key = row.ProductId.ToString();
            var isBreached = row.QuantityOnHand < threshold;
            var wasBreached = state.Breached.GetValueOrDefault(key);

            if (isBreached && !wasBreached)
            {
                var subject = $"⚠️ Low stock alert: {row.Product?.Name} at {warehouseName}";
                var body =
                    $"Stock alert triggered by workflow \"{workflow.Name}\".\n\n" +
                    $"Product: {row.Product?.Name} ({row.Product?.Sku})\n" +
                    $"Warehouse: {warehouseName}\n" +
                    $"Current quantity on hand: {row.QuantityOnHand}\n" +
                    $"Configured threshold: {threshold}\n\n" +
                    $"— InvenAI Automate Workflow";

                var sent = await email.SendAsync(recipient, subject, body);
                db.WorkflowEvents.Add(new WorkflowEvent
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = workflow.Id,
                    EventType = sent ? "AlertSent" : "EmailFailed",
                    Message = sent
                        ? $"Alert sent to {recipient}: {row.Product?.Name} at {row.QuantityOnHand} units (below {threshold})."
                        : $"Stock breach detected ({row.Product?.Name} at {row.QuantityOnHand} units) but email could not be sent — check Email:Username/AppPassword configuration.",
                    CreatedAt = now
                });
                workflow.LastTriggeredAt = now;
                state.Breached[key] = true;
            }
            else if (!isBreached && wasBreached)
            {
                state.Breached[key] = false;
            }
        }

        workflow.State = JsonSerializer.Serialize(state, JsonOptions);
        workflow.LastRunAt = now;
        workflow.UpdatedAt = now;
    }

    // ---------- Trigger ----------

    private static async Task RunTriggerAsync(InventoryDbContext db, IEmailService email, IShipmentService shipmentService, Workflow workflow)
    {
        var config = JsonSerializer.Deserialize<JsonElement>(workflow.Config, JsonOptions);
        var packageOrderId = config.GetProperty("packageOrderId").GetGuid();
        var packageOrderNumber = config.GetProperty("packageOrderNumber").GetString() ?? "";
        var scheduledAt = config.GetProperty("scheduledAt").GetDateTime();
        var recipient = config.GetProperty("recipientEmail").GetString()!;

        var state = DeserializeState<TriggerState>(workflow.State);
        var now = DateTime.UtcNow;

        if (state.ShipmentId == null)
        {
            if (now < scheduledAt) { workflow.LastRunAt = now; return; }

            try
            {
                var shipment = await shipmentService.CreateAsync(new CreateShipmentDto
                {
                    Reference = $"Auto-shipped by workflow: {workflow.Name}",
                    PackageOrderId = packageOrderId,
                    OriginName = config.GetProperty("originName").GetString()!,
                    OriginLat = config.GetProperty("originLat").GetDouble(),
                    OriginLng = config.GetProperty("originLng").GetDouble(),
                    DestinationName = config.GetProperty("destinationName").GetString()!,
                    DestinationLat = config.GetProperty("destinationLat").GetDouble(),
                    DestinationLng = config.GetProperty("destinationLng").GetDouble()
                }, workflow.CreatedBy);

                state.ShipmentId = shipment.Id;
                state.ShipmentOrderNumber = shipment.OrderNumber;
                workflow.LastTriggeredAt = now;

                db.WorkflowEvents.Add(new WorkflowEvent
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = workflow.Id,
                    EventType = "ShipmentCreated",
                    Message = $"Package order {packageOrderNumber} auto-shipped as {shipment.OrderNumber} at its scheduled time.",
                    CreatedAt = now
                });
            }
            catch (Exception ex) when (ex is BadRequestException or NotFoundException)
            {
                workflow.Status = "Failed";
                db.WorkflowEvents.Add(new WorkflowEvent
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = workflow.Id,
                    EventType = "Error",
                    Message = $"Could not auto-ship package order {packageOrderNumber}: {ex.Message}",
                    CreatedAt = now
                });
            }
        }
        else if (!state.Reported)
        {
            var shipment = await shipmentService.GetByIdAsync(state.ShipmentId.Value);

            if (shipment.Status is "Delivered" or "Cancelled")
            {
                var subject = $"📦 Shipment {shipment.Status.ToLowerInvariant()}: {shipment.OrderNumber}";
                var body =
                    $"Automated shipment report for workflow \"{workflow.Name}\".\n\n" +
                    $"Package order: {packageOrderNumber}\n" +
                    $"Shipment: {shipment.OrderNumber}\n" +
                    $"Status: {shipment.Status}\n" +
                    $"Route: {shipment.OriginName} → {shipment.DestinationName}\n" +
                    $"Distance: {shipment.DistanceKm:0.0} km\n" +
                    $"Started: {shipment.StartedAt:g} UTC\n" +
                    $"{(shipment.Status == "Delivered" ? $"Delivered: {shipment.DeliveredAt:g} UTC" : $"Cancelled: {shipment.CancelledAt:g} UTC")}\n\n" +
                    $"— InvenAI Automate Workflow";

                var sent = await email.SendAsync(recipient, subject, body);
                db.WorkflowEvents.Add(new WorkflowEvent
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = workflow.Id,
                    EventType = sent ? "ReportSent" : "EmailFailed",
                    Message = sent
                        ? $"Completion report for {shipment.OrderNumber} ({shipment.Status}) sent to {recipient}."
                        : $"Shipment {shipment.OrderNumber} reached {shipment.Status} but the report email could not be sent.",
                    CreatedAt = now
                });

                state.Reported = true;
                workflow.Status = "Completed";
            }
        }

        workflow.State = JsonSerializer.Serialize(state, JsonOptions);
        workflow.LastRunAt = now;
        workflow.UpdatedAt = now;
    }

    // ---------- SupplyChain ----------

    private static async Task RunSupplyChainAsync(InventoryDbContext db, IEmailService email, Workflow workflow)
    {
        var config = JsonSerializer.Deserialize<JsonElement>(workflow.Config, JsonOptions);
        var productId = config.GetProperty("productId").GetGuid();
        var productName = config.GetProperty("productName").GetString() ?? "";
        var warehouseId = config.GetProperty("warehouseId").GetGuid();
        var warehouseName = config.GetProperty("warehouseName").GetString() ?? "";
        var threshold = config.GetProperty("thresholdQuantity").GetInt32();
        var recipient = config.GetProperty("recipientEmail").GetString()!;

        var state = DeserializeState<SupplyChainState>(workflow.State);
        var now = DateTime.UtcNow;

        // 1) Stock threshold, edge-triggered.
        var inventory = await db.Inventory.FirstOrDefaultAsync(i => i.ProductId == productId && i.WarehouseId == warehouseId);
        var quantity = inventory?.QuantityOnHand ?? 0;
        var isBreached = quantity < threshold;

        if (isBreached && !state.Breached)
        {
            var subject = $"⚠️ Supply chain alert: {productName} low at {warehouseName}";
            var body =
                $"Supply chain monitor \"{workflow.Name}\" detected low stock.\n\n" +
                $"Product: {productName}\nWarehouse: {warehouseName}\n" +
                $"Current quantity: {quantity}\nThreshold: {threshold}\n\n— InvenAI Automate Workflow";

            var sent = await email.SendAsync(recipient, subject, body);
            db.WorkflowEvents.Add(new WorkflowEvent
            {
                Id = Guid.NewGuid(),
                WorkflowId = workflow.Id,
                EventType = sent ? "AlertSent" : "EmailFailed",
                Message = sent
                    ? $"Low-stock alert sent to {recipient}: {quantity} units (below {threshold})."
                    : "Low-stock breach detected but the email could not be sent.",
                CreatedAt = now
            });
            workflow.LastTriggeredAt = now;
        }
        state.Breached = isBreached;

        // 2) Shipment status changes for any package order carrying this product from this warehouse.
        var shipmentIds = await db.PackageOrders
            .Where(o => o.WarehouseId == warehouseId && o.ShipmentId != null &&
                        db.PackageOrderItems.Any(i => i.PackageOrderId == o.Id && i.ProductId == productId))
            .Select(o => o.ShipmentId!.Value)
            .ToListAsync();

        foreach (var shipmentId in shipmentIds)
        {
            var key = shipmentId.ToString();
            if (state.NotifiedShipmentIds.Contains(key)) continue;

            var shipment = await db.Shipments.FirstOrDefaultAsync(s => s.Id == shipmentId);
            if (shipment == null || shipment.Status is not ("Delivered" or "Cancelled")) continue;

            var subject = $"📦 Supply chain update: shipment {shipment.Status.ToLowerInvariant()}";
            var body =
                $"Supply chain monitor \"{workflow.Name}\" — a shipment carrying {productName} has updated.\n\n" +
                $"Shipment: {shipment.OrderNumber}\nStatus: {shipment.Status}\n" +
                $"Route: {shipment.OriginName} → {shipment.DestinationName}\n\n— InvenAI Automate Workflow";

            var sent = await email.SendAsync(recipient, subject, body);
            db.WorkflowEvents.Add(new WorkflowEvent
            {
                Id = Guid.NewGuid(),
                WorkflowId = workflow.Id,
                EventType = sent ? "ReportSent" : "EmailFailed",
                Message = sent
                    ? $"Shipment update ({shipment.OrderNumber}: {shipment.Status}) sent to {recipient}."
                    : $"Shipment {shipment.OrderNumber} reached {shipment.Status} but the report email could not be sent.",
                CreatedAt = now
            });
            state.NotifiedShipmentIds.Add(key);
            workflow.LastTriggeredAt = now;
        }

        workflow.State = JsonSerializer.Serialize(state, JsonOptions);
        workflow.LastRunAt = now;
        workflow.UpdatedAt = now;
    }

    private static T DeserializeState<T>(string json) where T : new()
    {
        if (string.IsNullOrWhiteSpace(json) || json == "{}") return new T();
        try
        {
            return JsonSerializer.Deserialize<T>(json, JsonOptions) ?? new T();
        }
        catch
        {
            return new T();
        }
    }
}
