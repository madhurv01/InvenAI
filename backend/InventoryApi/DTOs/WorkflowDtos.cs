using System.ComponentModel.DataAnnotations;

namespace InventoryApi.DTOs;

// ---------- Create requests (one per workflow type) ----------

public class CreateAlertWorkflowDto
{
    [Required, StringLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public Guid WarehouseId { get; set; }

    /// <summary>Optional — if omitted, every product stocked at the warehouse is monitored individually against the same threshold.</summary>
    public Guid? ProductId { get; set; }

    [Required, Range(1, int.MaxValue)]
    public int ThresholdQuantity { get; set; }

    [Required, EmailAddress, StringLength(200)]
    public string RecipientEmail { get; set; } = string.Empty;
}

public class CreateTriggerWorkflowDto
{
    [Required, StringLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public Guid PackageOrderId { get; set; }

    [Required]
    public DateTime ScheduledAt { get; set; }

    [Required, StringLength(300)]
    public string OriginName { get; set; } = string.Empty;
    [Required]
    public double OriginLat { get; set; }
    [Required]
    public double OriginLng { get; set; }

    [Required, StringLength(300)]
    public string DestinationName { get; set; } = string.Empty;
    [Required]
    public double DestinationLat { get; set; }
    [Required]
    public double DestinationLng { get; set; }

    [Required, EmailAddress, StringLength(200)]
    public string RecipientEmail { get; set; } = string.Empty;
}

public class CreateSupplyChainWorkflowDto
{
    [Required, StringLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public Guid ProductId { get; set; }

    [Required]
    public Guid WarehouseId { get; set; }

    [Required, Range(1, int.MaxValue)]
    public int ThresholdQuantity { get; set; }

    [Required, EmailAddress, StringLength(200)]
    public string RecipientEmail { get; set; } = string.Empty;
}

// ---------- Read shapes ----------

public class WorkflowEventDto
{
    public string EventType { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class WorkflowSummaryDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty; // human-readable one-liner, e.g. "Main Warehouse < 20 units"
    public DateTime CreatedAt { get; set; }
    public DateTime? LastRunAt { get; set; }
    public DateTime? LastTriggeredAt { get; set; }
}

public class WorkflowDetailDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public Dictionary<string, object?> Config { get; set; } = new();
    public List<WorkflowEventDto> Events { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime? LastRunAt { get; set; }
    public DateTime? LastTriggeredAt { get; set; }
}
