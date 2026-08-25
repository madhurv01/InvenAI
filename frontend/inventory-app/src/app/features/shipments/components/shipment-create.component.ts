import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import * as L from 'leaflet';
import { GeocodingService } from '../services/geocoding.service';
import { ShipmentService } from '../services/shipment.service';
import { PackageOrderService } from '../../package-orders/services/package-order.service';
import { GeocodeResult, PackageOrderDetail, PackageOrderPending } from '../../../shared/models/models';

type PickMode = 'origin' | 'destination' | null;

interface LocationSlot {
  name: string;
  lat: number | null;
  lng: number | null;
  query: string;
  suggestions: GeocodeResult[];
  showSuggestions: boolean;
}

@Component({
  selector: 'app-shipment-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header fade-in">
      <div>
        <h1>New Shipment</h1>
        <p style="color: var(--color-text-muted); margin: 0;">Create a shipment order and get real-time tracking on a live map.</p>
      </div>
      <button class="btn btn-secondary" (click)="router.navigate(['/shipments'])">← Back to Shipments</button>
    </div>

    <div class="create-layout slide-up">
      <div class="card form-panel">
        <div class="field" *ngIf="pendingOrders().length > 0 || linkedOrder()">
          <label class="field-label">📦 Link a Package Order (optional)</label>
          <select class="form-control" [ngModel]="selectedPackageOrderId" (ngModelChange)="onPackageOrderSelected($event)">
            <option [ngValue]="null">— Ship without a package order —</option>
            <option *ngFor="let o of pendingOrders()" [ngValue]="o.id">
              {{ o.orderNumber }} — {{ o.warehouseName }} ({{ o.itemCount }} item(s), {{ o.totalQuantity }} units)
            </option>
          </select>

          <div class="linked-order-card" *ngIf="linkedOrder() as lo">
            <div class="linked-order-header">
              <strong>{{ lo.orderNumber }}</strong>
              <span class="badge" [class.badge-danger]="lo.priority === 'High'" [class.badge-neutral]="lo.priority === 'Normal'" [class.badge-info]="lo.priority === 'Low'">{{ lo.priority }}</span>
            </div>
            <div class="linked-order-items">
              <div class="linked-item" *ngFor="let item of lo.items">
                {{ item.quantity }}× {{ item.productName }}
                <span class="linked-item-note" *ngIf="item.customizationNote"> — {{ item.customizationNote }}</span>
              </div>
            </div>
          </div>
        </div>

        <label class="field-label">Reference (optional)</label>
        <input class="form-control" [(ngModel)]="reference" placeholder="e.g. PO-2451, customer name…" />

        <div class="location-field">
          <label class="field-label">
            <span class="dot dot-origin"></span> Origin
            <button type="button" class="pick-btn" [class.active]="pickMode() === 'origin'" (click)="togglePick('origin')">
              {{ pickMode() === 'origin' ? 'Click map…' : '📍 Pick on map' }}
            </button>
          </label>
          <input
            class="form-control"
            [(ngModel)]="origin.query"
            (ngModelChange)="onQueryChange('origin', $event)"
            (focus)="origin.showSuggestions = true"
            placeholder="Search an address or place…" />
          <div class="suggestions" *ngIf="origin.showSuggestions && origin.suggestions.length > 0">
            <div class="suggestion-item" *ngFor="let s of origin.suggestions" (click)="selectSuggestion('origin', s)">
              {{ s.displayName }}
            </div>
          </div>
          <div class="coord-chip" *ngIf="origin.lat !== null">✓ {{ origin.lat!.toFixed(4) }}, {{ origin.lng!.toFixed(4) }}</div>
        </div>

        <div class="location-field">
          <label class="field-label">
            <span class="dot dot-dest"></span> Destination
            <button type="button" class="pick-btn" [class.active]="pickMode() === 'destination'" (click)="togglePick('destination')">
              {{ pickMode() === 'destination' ? 'Click map…' : '📍 Pick on map' }}
            </button>
          </label>
          <input
            class="form-control"
            [(ngModel)]="destination.query"
            (ngModelChange)="onQueryChange('destination', $event)"
            (focus)="destination.showSuggestions = true"
            placeholder="Search an address or place…" />
          <div class="suggestions" *ngIf="destination.showSuggestions && destination.suggestions.length > 0">
            <div class="suggestion-item" *ngFor="let s of destination.suggestions" (click)="selectSuggestion('destination', s)">
              {{ s.displayName }}
            </div>
          </div>
          <div class="coord-chip" *ngIf="destination.lat !== null">✓ {{ destination.lat!.toFixed(4) }}, {{ destination.lng!.toFixed(4) }}</div>
        </div>

        <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

        <button class="btn btn-primary submit-btn" [disabled]="!canSubmit() || submitting()" (click)="submit()">
          {{ submitting() ? 'Creating shipment…' : 'Create Shipment' }}
        </button>
      </div>

      <div class="card map-panel">
        <div class="map-hint" *ngIf="pickMode()">Click anywhere on the map to set the {{ pickMode() }}.</div>
        <div #mapEl class="picker-map"></div>
      </div>
    </div>
  `,
  styles: [`
    .create-layout { display: grid; grid-template-columns: 380px 1fr; gap: 20px; align-items: start; height: calc(100vh - 150px); min-height: 460px; }
    @media (max-width: 900px) { .create-layout { grid-template-columns: 1fr; height: auto; } }

    .form-panel { display: flex; flex-direction: column; gap: 6px; padding: 20px; height: 100%; overflow-y: auto; }
    .field-label { font-size: 12.5px; font-weight: 700; color: var(--color-text); display: flex; align-items: center; gap: 6px; margin: 14px 0 6px; }
    .field-label:first-of-type { margin-top: 0; }
    .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
    .dot-origin { background: #10b981; }
    .dot-dest { background: #f43f5e; }

    .pick-btn {
      margin-left: auto; border: 1px solid var(--color-border); background: #fff; border-radius: 999px;
      padding: 3px 10px; font-size: 11px; cursor: pointer; font-weight: 600; color: var(--color-text-muted);
    }
    .pick-btn:hover { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary); }
    .pick-btn.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }

    .linked-order-card {
      margin-top: 10px; padding: 10px 12px; border-radius: 10px;
      background: var(--color-primary-light); border: 1px solid var(--color-primary);
    }
    .linked-order-header { display: flex; align-items: center; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
    .linked-order-items { display: flex; flex-direction: column; gap: 3px; }
    .linked-item { font-size: 12px; color: var(--color-text); }
    .linked-item-note { color: var(--color-text-muted); font-style: italic; }
    .badge-info { background: #e0e7ff; color: #4338ca; }

    .location-field { position: relative; }
    .suggestions {
      position: absolute; top: 100%; left: 0; right: 0; z-index: 500;
      background: #fff; border: 1px solid var(--color-border); border-radius: 10px;
      margin-top: 4px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); max-height: 220px; overflow-y: auto;
    }
    .suggestion-item { padding: 9px 12px; font-size: 12.5px; cursor: pointer; border-bottom: 1px solid #f3f4f6; }
    .suggestion-item:last-child { border-bottom: none; }
    .suggestion-item:hover { background: var(--color-primary-light); }
    .coord-chip { font-size: 11.5px; color: #10b981; font-weight: 600; margin-top: 4px; }

    .submit-btn { margin-top: 20px; width: 100%; }

    .map-panel { padding: 12px; height: 100%; display: flex; flex-direction: column; position: relative; }
    .map-hint {
      position: absolute; top: 22px; left: 50%; transform: translateX(-50%); z-index: 500;
      background: var(--color-primary); color: #fff; padding: 6px 14px; border-radius: 999px;
      font-size: 12.5px; font-weight: 600; box-shadow: 0 4px 14px rgba(0,0,0,0.2);
    }
    .picker-map { flex: 1; border-radius: 10px; min-height: 300px; }
  `]
})
export class ShipmentCreateComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  reference = '';
  origin: LocationSlot = { name: '', lat: null, lng: null, query: '', suggestions: [], showSuggestions: false };
  destination: LocationSlot = { name: '', lat: null, lng: null, query: '', suggestions: [], showSuggestions: false };

  pickMode = signal<PickMode>(null);
  submitting = signal(false);
  errorMessage = signal('');

  pendingOrders = signal<PackageOrderPending[]>([]);
  linkedOrder = signal<PackageOrderDetail | null>(null);
  selectedPackageOrderId: string | null = null;

  private map?: L.Map;
  private originMarker?: L.Marker;
  private destMarker?: L.Marker;
  private originQuery$ = new Subject<string>();
  private destQuery$ = new Subject<string>();
  private pendingPackageOrderIdFromRoute: string | null = null;

  constructor(
    private geocoding: GeocodingService,
    private shipmentService: ShipmentService,
    private packageOrderService: PackageOrderService,
    private route: ActivatedRoute,
    public router: Router
  ) {
    this.originQuery$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(q => this.geocoding.search(q))
    ).subscribe(results => this.origin.suggestions = results);

    this.destQuery$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(q => this.geocoding.search(q))
    ).subscribe(results => this.destination.suggestions = results);
  }

  ngOnInit(): void {
    this.pendingPackageOrderIdFromRoute = this.route.snapshot.queryParamMap.get('packageOrderId');

    this.packageOrderService.getPending().subscribe({
      next: (orders) => {
        this.pendingOrders.set(orders);
        if (this.pendingPackageOrderIdFromRoute && orders.some(o => o.id === this.pendingPackageOrderIdFromRoute)) {
          this.onPackageOrderSelected(this.pendingPackageOrderIdFromRoute);
        }
      },
      error: () => {}
    });
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapEl.nativeElement, { preferCanvas: true }).setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
      updateWhenIdle: true,
      keepBuffer: 2
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const mode = this.pickMode();
      if (!mode) return;
      this.setLocationFromMap(mode, e.latlng.lat, e.latlng.lng);
      this.pickMode.set(null);
    });
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  onPackageOrderSelected(packageOrderId: string | null): void {
    this.selectedPackageOrderId = packageOrderId;
    this.linkedOrder.set(null);
    if (!packageOrderId) return;

    this.packageOrderService.getById(packageOrderId).subscribe({
      next: (order) => {
        this.linkedOrder.set(order);

        // Auto-fill the origin from the package order's warehouse — search it via geocoding
        // and use the top result, same as if the user had searched and picked it themselves.
        const query = order.warehouseLocation ? `${order.warehouseName}, ${order.warehouseLocation}` : order.warehouseName;
        this.origin.query = query;
        this.geocoding.search(query).subscribe({
          next: (results) => {
            if (results.length > 0) this.selectSuggestion('origin', results[0]);
          },
          error: () => {}
        });
      },
      error: (err) => this.errorMessage.set(err.friendlyMessage || 'Failed to load the selected package order.')
    });
  }

  togglePick(mode: 'origin' | 'destination'): void {
    this.pickMode.set(this.pickMode() === mode ? null : mode);
  }

  onQueryChange(slot: 'origin' | 'destination', value: string): void {
    this[slot].showSuggestions = true;
    (slot === 'origin' ? this.originQuery$ : this.destQuery$).next(value);
  }

  selectSuggestion(slot: 'origin' | 'destination', result: GeocodeResult): void {
    const s = this[slot];
    s.name = result.displayName;
    s.query = result.displayName;
    s.lat = result.lat;
    s.lng = result.lng;
    s.suggestions = [];
    s.showSuggestions = false;
    this.placeMarker(slot, result.lat, result.lng);
  }

  private setLocationFromMap(slot: 'origin' | 'destination', lat: number, lng: number): void {
    const s = this[slot];
    s.lat = lat;
    s.lng = lng;
    s.name = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    s.query = s.name;
    this.placeMarker(slot, lat, lng);

    this.geocoding.reverse(lat, lng).subscribe({
      next: (r) => { s.name = r.displayName; s.query = r.displayName; },
      error: () => {}
    });
  }

  private placeMarker(slot: 'origin' | 'destination', lat: number, lng: number): void {
    if (!this.map) return;
    const color = slot === 'origin' ? '#10b981' : '#f43f5e';
    const emoji = slot === 'origin' ? '📦' : '🏁';
    const icon = L.divIcon({
      className: 'picker-pin',
      html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2px solid #fff;"><span style="transform:rotate(45deg);font-size:14px;">${emoji}</span></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    if (slot === 'origin') {
      if (this.originMarker) this.originMarker.setLatLng([lat, lng]);
      else this.originMarker = L.marker([lat, lng], { icon, draggable: true }).addTo(this.map)
        .on('dragend', (e) => this.onMarkerDragged('origin', e));
    } else {
      if (this.destMarker) this.destMarker.setLatLng([lat, lng]);
      else this.destMarker = L.marker([lat, lng], { icon, draggable: true }).addTo(this.map)
        .on('dragend', (e) => this.onMarkerDragged('destination', e));
    }

    this.fitToMarkers();
  }

  private onMarkerDragged(slot: 'origin' | 'destination', e: L.LeafletEvent): void {
    const marker = e.target as L.Marker;
    const pos = marker.getLatLng();
    this.setLocationFromMap(slot, pos.lat, pos.lng);
  }

  private fitToMarkers(): void {
    if (!this.map) return;
    const points: L.LatLngExpression[] = [];
    if (this.originMarker) points.push(this.originMarker.getLatLng());
    if (this.destMarker) points.push(this.destMarker.getLatLng());
    if (points.length === 1) this.map.setView(points[0], 12);
    else if (points.length === 2) this.map.fitBounds(L.latLngBounds(points), { padding: [50, 50] });
  }

  canSubmit(): boolean {
    return this.origin.lat !== null && this.destination.lat !== null && !this.submitting();
  }

  submit(): void {
    if (!this.canSubmit()) return;
    this.submitting.set(true);
    this.errorMessage.set('');

    this.shipmentService.create({
      reference: this.reference.trim() || undefined,
      packageOrderId: this.selectedPackageOrderId || undefined,
      originName: this.origin.name || this.origin.query,
      originLat: this.origin.lat!,
      originLng: this.origin.lng!,
      destinationName: this.destination.name || this.destination.query,
      destinationLat: this.destination.lat!,
      destinationLng: this.destination.lng!
    }).subscribe({
      next: (shipment) => this.router.navigate(['/shipments', shipment.id]),
      error: (err) => {
        this.errorMessage.set(err.friendlyMessage || 'Failed to create shipment.');
        this.submitting.set(false);
      }
    });
  }
}
