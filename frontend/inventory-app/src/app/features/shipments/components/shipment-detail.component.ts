import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ShipmentService } from '../services/shipment.service';
import { ShipmentDetail } from '../../../shared/models/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ShipmentMapComponent } from './shipment-map.component';

@Component({
  selector: 'app-shipment-detail',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent, ShipmentMapComponent],
  template: `
    <div class="page-header fade-in">
      <div>
        <h1>{{ shipment()?.orderNumber || 'Shipment' }}</h1>
        <p style="color: var(--color-text-muted); margin: 0;">{{ shipment()?.reference || 'Live shipment tracking' }}</p>
      </div>
      <button class="btn btn-secondary" (click)="router.navigate(['/shipments'])">← Back to Shipments</button>
    </div>

    <app-loading-spinner *ngIf="loading()"></app-loading-spinner>
    <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

    <ng-container *ngIf="!loading() && shipment() as s">
      <div class="detail-layout slide-up">
        <div class="card map-card">
          <app-shipment-map
            [originLat]="s.originLat" [originLng]="s.originLng" [originName]="s.originName"
            [destLat]="s.destinationLat" [destLng]="s.destinationLng" [destName]="s.destinationName"
            [route]="s.route" [status]="s.status"
            [startedAt]="s.startedAt" [estimatedArrivalAt]="s.estimatedArrivalAt"
            [animate]="s.status === 'InTransit'">
          </app-shipment-map>
        </div>

        <div class="side-panel">
          <div class="card status-card">
            <span class="badge badge-lg"
                  [class.badge-neutral]="s.status === 'Pending'"
                  [class.badge-info]="s.status === 'InTransit'"
                  [class.badge-success]="s.status === 'Delivered'"
                  [class.badge-danger]="s.status === 'Cancelled'">
              {{ statusLabel(s.status) }}
            </span>

            <div class="progress-track big">
              <div class="progress-fill" [style.width.%]="liveProgress()"
                   [class.fill-done]="s.status === 'Delivered'"
                   [class.fill-cancelled]="s.status === 'Cancelled'"></div>
            </div>
            <div class="progress-text">{{ liveProgress().toFixed(0) }}% of the way there</div>

            <div class="timer-grid">
              <div class="timer-box">
                <div class="timer-label">Elapsed</div>
                <div class="timer-value">{{ elapsedLabel() }}</div>
              </div>
              <div class="timer-box">
                <div class="timer-label">{{ s.status === 'Delivered' ? 'Delivered' : 'Time Remaining' }}</div>
                <div class="timer-value">{{ s.status === 'Delivered' ? 'Arrived' : remainingLabel() }}</div>
              </div>
            </div>

            <div class="action-row" *ngIf="s.status === 'InTransit'">
              <button class="btn btn-secondary btn-sm" (click)="setStatus('Delivered')" [disabled]="updating()">Mark Delivered</button>
              <button class="btn btn-danger btn-sm" (click)="setStatus('Cancelled')" [disabled]="updating()">Cancel</button>
            </div>
          </div>

          <div class="card details-card">
            <h3>Shipment Details</h3>
            <dl>
              <dt>Origin</dt><dd>{{ s.originName }}</dd>
              <dt>Destination</dt><dd>{{ s.destinationName }}</dd>
              <dt>Distance</dt><dd>{{ s.distanceKm.toFixed(1) }} km</dd>
              <dt>Estimated Duration</dt><dd>{{ formatDuration(s.durationMinutes) }}</dd>
              <dt>Started</dt><dd>{{ s.startedAt | date:'MMM d, y, h:mm a' }}</dd>
              <dt>{{ s.status === 'Delivered' ? 'Delivered At' : 'Estimated Arrival' }}</dt>
              <dd>{{ (s.deliveredAt || s.estimatedArrivalAt) | date:'MMM d, y, h:mm a' }}</dd>
            </dl>
          </div>

          <div class="card package-order-card" *ngIf="s.packageOrderId">
            <h3>📦 Package Order</h3>
            <p style="font-size:13px; margin: 0 0 12px;">This shipment is carrying <strong>{{ s.packageOrderNumber }}</strong>.</p>
            <button class="btn btn-secondary btn-sm" style="width:100%" (click)="router.navigate(['/package-orders', s.packageOrderId])">View Package Order</button>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .detail-layout { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; height: calc(100vh - 150px); min-height: 480px; }
    @media (max-width: 900px) { .detail-layout { grid-template-columns: 1fr; height: auto; } }

    .map-card { padding: 12px; height: 100%; display: flex; }
    .map-card app-shipment-map { flex: 1; }

    .side-panel { display: flex; flex-direction: column; gap: 16px; height: 100%; overflow-y: auto; }
    .status-card { padding: 20px; }
    .badge-lg { font-size: 13px; padding: 6px 14px; }
    .badge-info { background: #e0e7ff; color: #4338ca; }

    .progress-track { background: #f3f4f6; border-radius: 8px; height: 10px; overflow: hidden; margin-top: 16px; }
    .progress-track.big { height: 12px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, var(--color-primary), var(--color-primary-dark)); border-radius: 8px; transition: width 0.6s ease; }
    .fill-done { background: #10b981; }
    .fill-cancelled { background: #cbd5e1; }
    .progress-text { font-size: 12px; color: var(--color-text-muted); margin-top: 6px; }

    .timer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; }
    .timer-box { background: #f9fafb; border-radius: 10px; padding: 12px; text-align: center; }
    .timer-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-muted); font-weight: 700; }
    .timer-value { font-size: 17px; font-weight: 800; font-family: 'Manrope', sans-serif; margin-top: 4px; color: var(--color-text); }

    .action-row { display: flex; gap: 8px; margin-top: 18px; }
    .action-row .btn { flex: 1; }

    .details-card h3 { margin-bottom: 12px; }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 8px 12px; margin: 0; }
    dt { font-size: 11.5px; color: var(--color-text-muted); font-weight: 600; white-space: nowrap; }
    dd { margin: 0; font-size: 12.5px; text-align: right; overflow: hidden; text-overflow: ellipsis; }
  `]
})
export class ShipmentDetailComponent implements OnInit, OnDestroy {
  shipment = signal<ShipmentDetail | null>(null);
  loading = signal(true);
  errorMessage = signal('');
  updating = signal(false);
  liveProgress = signal(0);

  private tickHandle?: ReturnType<typeof setInterval>;
  private id!: string;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private shipmentService: ShipmentService
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.load();
    this.tickHandle = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);
  }

  load(): void {
    this.loading.set(true);
    this.shipmentService.getById(this.id).subscribe({
      next: (s) => {
        this.shipment.set(s);
        this.liveProgress.set(s.progressPercent);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.friendlyMessage || 'Failed to load shipment.');
        this.loading.set(false);
      }
    });
  }

  private tick(): void {
    const s = this.shipment();
    if (!s) return;

    if (s.status === 'Delivered') { this.liveProgress.set(100); return; }
    if (s.status === 'Cancelled') { this.liveProgress.set(0); return; }

    const start = new Date(s.startedAt).getTime();
    const end = new Date(s.estimatedArrivalAt).getTime();
    const now = Date.now();
    const pct = end > start ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)) : 100;
    this.liveProgress.set(pct);

    if (pct >= 100) this.load(); // pick up the server-side auto-transition to Delivered
  }

  elapsedLabel(): string {
    const s = this.shipment();
    if (!s) return '—';
    const ms = Date.now() - new Date(s.startedAt).getTime();
    return this.formatDuration(Math.max(0, Math.floor(ms / 60000)));
  }

  remainingLabel(): string {
    const s = this.shipment();
    if (!s) return '—';
    const ms = new Date(s.estimatedArrivalAt).getTime() - Date.now();
    if (ms <= 0) return 'Arriving now';
    return this.formatDuration(Math.ceil(ms / 60000));
  }

  formatDuration(totalMinutes: number): string {
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
    return parts.join(' ');
  }

  statusLabel(status: string): string {
    return status === 'InTransit' ? 'In Transit' : status;
  }

  setStatus(status: 'Delivered' | 'Cancelled'): void {
    this.updating.set(true);
    this.shipmentService.updateStatus(this.id, status).subscribe({
      next: (s) => {
        this.shipment.set(s);
        this.liveProgress.set(s.progressPercent);
        this.updating.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.friendlyMessage || 'Failed to update shipment status.');
        this.updating.set(false);
      }
    });
  }
}
