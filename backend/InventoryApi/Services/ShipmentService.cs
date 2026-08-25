using System.Text.Json;
using InventoryApi.Data;
using InventoryApi.DTOs;
using InventoryApi.Middleware;
using InventoryApi.Models;
using InventoryApi.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InventoryApi.Services;

/// <summary>
/// Shipment chain: user picks/searches origin + destination -> server asks the free, open-source
/// OSRM routing API (router.project-osrm.org, no key/billing) for the real road route, distance
/// and travel time -> stored once and reused. Progress/status are derived from elapsed wall-clock
/// time against the estimated arrival, so tracking looks live without needing a background job or
/// real GPS feed.
/// </summary>
public class ShipmentService : IShipmentService
{
    private readonly InventoryDbContext _db;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<ShipmentService> _logger;

    public ShipmentService(
        InventoryDbContext db,
        IHttpClientFactory httpClientFactory,
        IConfiguration config,
        ILogger<ShipmentService> logger)
    {
        _db = db;
        _httpClient = httpClientFactory.CreateClient("Osrm");
        _config = config;
        _logger = logger;
    }

    public async Task<ShipmentDetailDto> CreateAsync(CreateShipmentDto dto, Guid? userId)
    {
        PackageOrder? packageOrder = null;
        if (dto.PackageOrderId.HasValue)
        {
            packageOrder = await _db.PackageOrders.FirstOrDefaultAsync(o => o.Id == dto.PackageOrderId.Value)
                ?? throw new NotFoundException("Package order not found.");
            if (packageOrder.Status != "Pending")
                throw new BadRequestException($"Package order {packageOrder.OrderNumber} is already {packageOrder.Status}.");
        }

        var (routePoints, distanceKm, durationMinutes) = await FetchRouteAsync(
            dto.OriginLat, dto.OriginLng, dto.DestinationLat, dto.DestinationLng);

        var now = DateTime.UtcNow;
        var shipment = new Shipment
        {
            Id = Guid.NewGuid(),
            OrderNumber = GenerateOrderNumber(),
            Reference = dto.Reference,
            OriginName = dto.OriginName,
            OriginLat = dto.OriginLat,
            OriginLng = dto.OriginLng,
            DestinationName = dto.DestinationName,
            DestinationLat = dto.DestinationLat,
            DestinationLng = dto.DestinationLng,
            RouteGeoJson = JsonSerializer.Serialize(routePoints),
            DistanceKm = distanceKm,
            DurationMinutes = durationMinutes,
            Status = "InTransit",
            StartedAt = now,
            EstimatedArrivalAt = now.AddMinutes(Math.Max(durationMinutes, 1)),
            CreatedBy = userId,
            CreatedAt = now
        };

        _db.Shipments.Add(shipment);

        if (packageOrder != null)
        {
            packageOrder.Status = "Shipped";
            packageOrder.ShipmentId = shipment.Id;
            packageOrder.ShippedAt = now;
        }

        await _db.SaveChangesAsync();

        return ToDetailDto(shipment, routePoints, packageOrder?.OrderNumber, packageOrder?.Id);
    }

    public async Task<List<ShipmentSummaryDto>> GetAllAsync()
    {
        var shipments = await _db.Shipments.OrderByDescending(s => s.CreatedAt).ToListAsync();

        var changed = false;
        var now = DateTime.UtcNow;
        foreach (var s in shipments)
            changed |= ResolveLiveStatus(s, now);

        if (changed) await _db.SaveChangesAsync();

        var shipmentIds = shipments.Select(s => s.Id).ToList();
        var packageOrderNumbers = await _db.PackageOrders
            .Where(o => o.ShipmentId != null && shipmentIds.Contains(o.ShipmentId!.Value))
            .ToDictionaryAsync(o => o.ShipmentId!.Value, o => o.OrderNumber);

        return shipments.Select(s => new ShipmentSummaryDto
        {
            Id = s.Id,
            OrderNumber = s.OrderNumber,
            Reference = s.Reference,
            PackageOrderNumber = packageOrderNumbers.GetValueOrDefault(s.Id),
            OriginName = s.OriginName,
            DestinationName = s.DestinationName,
            Status = s.Status,
            DistanceKm = s.DistanceKm,
            ProgressPercent = ComputeProgress(s, now),
            StartedAt = s.StartedAt,
            EstimatedArrivalAt = s.EstimatedArrivalAt,
            CreatedAt = s.CreatedAt
        }).ToList();
    }

    public async Task<ShipmentDetailDto> GetByIdAsync(Guid id)
    {
        var shipment = await _db.Shipments.FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new NotFoundException("Shipment not found.");

        if (ResolveLiveStatus(shipment, DateTime.UtcNow))
            await _db.SaveChangesAsync();

        var packageOrder = await _db.PackageOrders.FirstOrDefaultAsync(o => o.ShipmentId == id);

        var route = JsonSerializer.Deserialize<List<double[]>>(shipment.RouteGeoJson) ?? new();
        return ToDetailDto(shipment, route, packageOrder?.OrderNumber, packageOrder?.Id);
    }

    public async Task<ShipmentDetailDto> UpdateStatusAsync(Guid id, string status)
    {
        if (status is not ("Delivered" or "Cancelled"))
            throw new BadRequestException("Status can only be manually set to Delivered or Cancelled.");

        var shipment = await _db.Shipments.FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new NotFoundException("Shipment not found.");

        if (shipment.Status is "Delivered" or "Cancelled")
            throw new BadRequestException($"Shipment is already {shipment.Status}.");

        var now = DateTime.UtcNow;
        shipment.Status = status;
        if (status == "Delivered") shipment.DeliveredAt = now;
        if (status == "Cancelled") shipment.CancelledAt = now;

        await _db.SaveChangesAsync();

        var packageOrder = await _db.PackageOrders.FirstOrDefaultAsync(o => o.ShipmentId == id);
        var route = JsonSerializer.Deserialize<List<double[]>>(shipment.RouteGeoJson) ?? new();
        return ToDetailDto(shipment, route, packageOrder?.OrderNumber, packageOrder?.Id);
    }

    public async Task DeleteAsync(Guid id)
    {
        var shipment = await _db.Shipments.FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new NotFoundException("Shipment not found.");

        // If a package order was riding on this shipment, free it back up so it can be re-shipped.
        var linkedOrder = await _db.PackageOrders.FirstOrDefaultAsync(o => o.ShipmentId == id);
        if (linkedOrder != null)
        {
            linkedOrder.Status = "Pending";
            linkedOrder.ShipmentId = null;
            linkedOrder.ShippedAt = null;
        }

        _db.Shipments.Remove(shipment);
        await _db.SaveChangesAsync();
    }

    // ---------- helpers ----------

    private static string GenerateOrderNumber()
    {
        var datePart = DateTime.UtcNow.ToString("yyyyMMdd");
        var randomPart = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
        return $"SHP-{datePart}-{randomPart}";
    }

    /// <summary>Auto-transitions InTransit -> Delivered once the estimated arrival time has passed. Returns true if the entity was changed.</summary>
    private static bool ResolveLiveStatus(Shipment s, DateTime now)
    {
        if (s.Status != "InTransit") return false;
        if (now < s.EstimatedArrivalAt) return false;

        s.Status = "Delivered";
        s.DeliveredAt = s.EstimatedArrivalAt;
        return true;
    }

    private static double ComputeProgress(Shipment s, DateTime now)
    {
        if (s.Status == "Delivered") return 100;
        if (s.Status == "Cancelled") return 0;

        var totalMs = (s.EstimatedArrivalAt - s.StartedAt).TotalMilliseconds;
        if (totalMs <= 0) return 100;

        var elapsedMs = (now - s.StartedAt).TotalMilliseconds;
        var pct = elapsedMs / totalMs * 100;
        return Math.Clamp(pct, 0, 100);
    }

    private static ShipmentDetailDto ToDetailDto(Shipment s, List<double[]> route, string? packageOrderNumber = null, Guid? packageOrderId = null)
    {
        var now = DateTime.UtcNow;
        return new ShipmentDetailDto
        {
            Id = s.Id,
            OrderNumber = s.OrderNumber,
            Reference = s.Reference,
            PackageOrderId = packageOrderId,
            PackageOrderNumber = packageOrderNumber,
            OriginName = s.OriginName,
            OriginLat = s.OriginLat,
            OriginLng = s.OriginLng,
            DestinationName = s.DestinationName,
            DestinationLat = s.DestinationLat,
            DestinationLng = s.DestinationLng,
            Route = route,
            DistanceKm = s.DistanceKm,
            DurationMinutes = s.DurationMinutes,
            Status = s.Status,
            ProgressPercent = ComputeProgress(s, now),
            StartedAt = s.StartedAt,
            EstimatedArrivalAt = s.EstimatedArrivalAt,
            DeliveredAt = s.DeliveredAt,
            CancelledAt = s.CancelledAt,
            CreatedAt = s.CreatedAt
        };
    }

    /// <summary>Calls the free public OSRM demo server for a real driving route between two points. Falls back to a straight line if OSRM is unreachable.</summary>
    private async Task<(List<double[]> Route, decimal DistanceKm, int DurationMinutes)> FetchRouteAsync(
        double originLat, double originLng, double destLat, double destLng)
    {
        var baseUrl = _config["Osrm:BaseUrl"] ?? "https://router.project-osrm.org";
        // "simplified" (Douglas-Peucker, zoom-level-appropriate) keeps the route visually
        // identical on a tracking map while cutting point count — and therefore payload size
        // and client-side render cost — by roughly 10-20x versus "full" geometry.
        var url = $"{baseUrl}/route/v1/driving/{originLng.ToString(System.Globalization.CultureInfo.InvariantCulture)},{originLat.ToString(System.Globalization.CultureInfo.InvariantCulture)};{destLng.ToString(System.Globalization.CultureInfo.InvariantCulture)},{destLat.ToString(System.Globalization.CultureInfo.InvariantCulture)}?overview=simplified&geometries=geojson";

        try
        {
            var response = await _httpClient.GetAsync(url);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("OSRM routing call failed: {Status} {Body}", response.StatusCode, body);
                return StraightLineFallback(originLat, originLng, destLat, destLng);
            }

            using var doc = JsonDocument.Parse(body);
            var routes = doc.RootElement.GetProperty("routes");
            if (routes.GetArrayLength() == 0)
                return StraightLineFallback(originLat, originLng, destLat, destLng);

            var route = routes[0];
            var distanceMeters = route.GetProperty("distance").GetDouble();
            var durationSeconds = route.GetProperty("duration").GetDouble();
            var coordinates = route.GetProperty("geometry").GetProperty("coordinates");

            var points = new List<double[]>();
            foreach (var coord in coordinates.EnumerateArray())
            {
                // OSRM returns [lng, lat] — Leaflet wants [lat, lng].
                var lng = coord[0].GetDouble();
                var lat = coord[1].GetDouble();
                points.Add(new[] { lat, lng });
            }

            return (points, (decimal)(distanceMeters / 1000.0), (int)Math.Ceiling(durationSeconds / 60.0));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling OSRM routing API");
            return StraightLineFallback(originLat, originLng, destLat, destLng);
        }
    }

    private static (List<double[]>, decimal, int) StraightLineFallback(double originLat, double originLng, double destLat, double destLng)
    {
        var distanceKm = (decimal)HaversineKm(originLat, originLng, destLat, destLng);
        // Assume an average of 50 km/h when we don't have a real routed ETA.
        var durationMinutes = (int)Math.Max(1, Math.Ceiling((double)distanceKm / 50.0 * 60.0));
        var points = new List<double[]> { new[] { originLat, originLng }, new[] { destLat, destLng } };
        return (points, distanceKm, durationMinutes);
    }

    private static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double earthRadiusKm = 6371.0;
        var dLat = (lat2 - lat1) * Math.PI / 180.0;
        var dLon = (lon2 - lon1) * Math.PI / 180.0;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return earthRadiusKm * c;
    }
}
