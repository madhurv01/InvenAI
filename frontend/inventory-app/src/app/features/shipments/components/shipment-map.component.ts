import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { ShipmentStatus } from '../../../shared/models/models';

@Component({
  selector: 'app-shipment-map',
  standalone: true,
  imports: [CommonModule],
  template: `<div #mapEl class="shipment-map"></div>`,
  styles: [`
    .shipment-map {
      width: 100%;
      height: 100%;
      min-height: 260px;
      border-radius: 12px;
      z-index: 0;
    }
  `]
})
export class ShipmentMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  @Input() originLat!: number;
  @Input() originLng!: number;
  @Input() originName = 'Origin';
  @Input() destLat!: number;
  @Input() destLng!: number;
  @Input() destName = 'Destination';
  @Input() route: number[][] = [];
  @Input() status: ShipmentStatus = 'InTransit';
  @Input() startedAt?: string;
  @Input() estimatedArrivalAt?: string;
  @Input() animate = true;

  private map?: L.Map;
  private routeLine?: L.Polyline;
  private movingMarker?: L.Marker;
  private animationHandle?: ReturnType<typeof setInterval>;
  private initialized = false;

  ngAfterViewInit(): void {
    this.initMap();
    this.initialized = true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized || !this.map) return;
    if (changes['route'] || changes['originLat'] || changes['destLat']) {
      this.drawRoute();
    }
  }

  ngOnDestroy(): void {
    if (this.animationHandle) clearInterval(this.animationHandle);
    this.map?.remove();
  }

  private initMap(): void {
    this.map = L.map(this.mapEl.nativeElement, {
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true // canvas renders polylines/markers noticeably faster than SVG once a route has many points
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
      updateWhenIdle: true, // skip fetching tiles for every intermediate frame while panning/zooming
      keepBuffer: 2
    }).addTo(this.map);

    this.drawRoute();
  }

  private drawRoute(): void {
    if (!this.map) return;

    const latlngs: L.LatLngExpression[] = this.route.length > 0
      ? this.route.map(p => [p[0], p[1]] as L.LatLngExpression)
      : [[this.originLat, this.originLng], [this.destLat, this.destLng]];

    if (this.routeLine) this.routeLine.remove();
    this.routeLine = L.polyline(latlngs, {
      color: '#4f46e5',
      weight: 4,
      opacity: 0.85,
      lineJoin: 'round'
    }).addTo(this.map);

    L.marker([this.originLat, this.originLng], { icon: this.pinIcon('#10b981', '📦') })
      .addTo(this.map)
      .bindPopup(`<strong>Origin</strong><br>${this.escape(this.originName)}`);

    L.marker([this.destLat, this.destLng], { icon: this.pinIcon('#f43f5e', '🏁') })
      .addTo(this.map)
      .bindPopup(`<strong>Destination</strong><br>${this.escape(this.destName)}`);

    this.map.fitBounds(this.routeLine.getBounds(), { padding: [36, 36] });

    if (this.movingMarker) this.movingMarker.remove();
    this.movingMarker = L.marker([this.originLat, this.originLng], { icon: this.truckIcon() }).addTo(this.map);

    if (this.animate) this.startAnimation(latlngs);
    else this.positionMarkerAtProgress(latlngs, this.status === 'Delivered' ? 1 : 0);
  }

  private startAnimation(latlngs: L.LatLngExpression[]): void {
    if (this.animationHandle) clearInterval(this.animationHandle);
    const tick = () => this.positionMarkerAtProgress(latlngs, this.computeLiveProgress());
    tick();
    this.animationHandle = setInterval(tick, 1000);
  }

  private computeLiveProgress(): number {
    if (this.status === 'Delivered') return 1;
    if (this.status === 'Cancelled') return 0;
    if (!this.startedAt || !this.estimatedArrivalAt) return 0;

    const start = new Date(this.startedAt).getTime();
    const end = new Date(this.estimatedArrivalAt).getTime();
    const now = Date.now();
    if (end <= start) return 1;

    return Math.min(1, Math.max(0, (now - start) / (end - start)));
  }

  private positionMarkerAtProgress(latlngs: L.LatLngExpression[], progress: number): void {
    if (!this.movingMarker || latlngs.length === 0) return;

    const index = Math.min(latlngs.length - 1, Math.floor(progress * (latlngs.length - 1)));
    const point = latlngs[index];
    this.movingMarker.setLatLng(point);

    const icon = progress >= 1 ? this.pinIcon('#4f46e5', '✅') : this.truckIcon();
    this.movingMarker.setIcon(icon);
  }

  private pinIcon(color: string, emoji: string): L.DivIcon {
    return L.divIcon({
      className: 'shipment-pin',
      html: `<div style="
        width:34px;height:34px;border-radius:50% 50% 50% 0;
        background:${color};transform:rotate(-45deg);
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2px solid #fff;">
        <span style="transform:rotate(45deg);font-size:15px;">${emoji}</span>
      </div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -30]
    });
  }

  private truckIcon(): L.DivIcon {
    return L.divIcon({
      className: 'shipment-truck',
      html: `<div style="
        width:30px;height:30px;border-radius:50%;
        background:#fff;display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 10px rgba(79,70,229,0.6);border:2px solid #4f46e5;
        font-size:16px;">🚚</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  }

  private escape(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
