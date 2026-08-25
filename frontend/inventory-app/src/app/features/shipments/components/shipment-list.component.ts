import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ShipmentService } from '../services/shipment.service';
import { ShipmentSummary } from '../../../shared/models/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-shipment-list',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent],
  template: `
    <div class="page-header fade-in">
      <div>
        <h1>Shipments</h1>
        <p style="color: var(--color-text-muted); margin: 0;">Create and track shipment orders on a live map.</p>
      </div>
      <button class="btn btn-primary" (click)="router.navigate(['/shipments/new'])">+ New Shipment</button>
    </div>

    <app-loading-spinner *ngIf="loading()"></app-loading-spinner>
    <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

    <div class="card slide-up" *ngIf="!loading()">
      <div class="empty-state" *ngIf="shipments().length === 0">
        No shipments yet. Create your first shipment order to start tracking it live.
      </div>

      <div style="overflow-x:auto" *ngIf="shipments().length > 0">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Reference</th>
              <th>Route</th>
              <th>Distance</th>
              <th>Status</th>
              <th>Progress</th>
              <th>ETA</th>
              <th></th>
            </tr>
          </thead>
          <tbody class="stagger">
            <tr *ngFor="let s of shipments()" class="clickable-row" (click)="router.navigate(['/shipments', s.id])">
              <td>
                <strong>{{ s.orderNumber }}</strong>
                <div class="package-tag" *ngIf="s.packageOrderNumber">📦 {{ s.packageOrderNumber }}</div>
              </td>
              <td>{{ s.reference || '—' }}</td>
              <td class="route-cell">
                <span class="route-point">{{ s.originName }}</span>
                <span class="route-arrow">→</span>
                <span class="route-point">{{ s.destinationName }}</span>
              </td>
              <td>{{ s.distanceKm.toFixed(1) }} km</td>
              <td>
                <span class="badge"
                      [class.badge-neutral]="s.status === 'Pending'"
                      [class.badge-info]="s.status === 'InTransit'"
                      [class.badge-success]="s.status === 'Delivered'"
                      [class.badge-danger]="s.status === 'Cancelled'">
                  {{ statusLabel(s.status) }}
                </span>
              </td>
              <td>
                <div class="progress-track">
                  <div class="progress-fill" [style.width.%]="s.progressPercent"
                       [class.fill-done]="s.status === 'Delivered'"
                       [class.fill-cancelled]="s.status === 'Cancelled'"></div>
                </div>
                <span class="progress-label">{{ s.progressPercent.toFixed(0) }}%</span>
              </td>
              <td>{{ s.status === 'Delivered' ? 'Delivered' : (s.estimatedArrivalAt | date:'MMM d, h:mm a') }}</td>
              <td><span class="chevron">›</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .clickable-row { cursor: pointer; }
    .clickable-row:hover { background: #f9fafb; }
    .package-tag { font-size: 10.5px; color: var(--color-text-muted); margin-top: 2px; }
    .route-cell { display: flex; align-items: center; gap: 6px; font-size: 12.5px; max-width: 320px; }
    .route-point { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; }
    .route-arrow { color: var(--color-text-muted); flex-shrink: 0; }
    .badge-info { background: #e0e7ff; color: #4338ca; }
    .progress-track { width: 90px; height: 6px; background: #f3f4f6; border-radius: 4px; overflow: hidden; display: inline-block; vertical-align: middle; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, var(--color-primary), var(--color-primary-dark)); border-radius: 4px; transition: width 0.4s ease; }
    .fill-done { background: #10b981; }
    .fill-cancelled { background: #cbd5e1; }
    .progress-label { font-size: 11px; color: var(--color-text-muted); margin-left: 6px; }
    .chevron { color: var(--color-text-muted); font-size: 16px; }
  `]
})
export class ShipmentListComponent implements OnInit, OnDestroy {
  shipments = signal<ShipmentSummary[]>([]);
  loading = signal(true);
  errorMessage = signal('');

  private refreshHandle?: ReturnType<typeof setInterval>;

  constructor(private shipmentService: ShipmentService, public router: Router) {}

  ngOnInit(): void {
    this.load();
    // Light polling so progress bars / statuses stay live while browsing the list.
    this.refreshHandle = setInterval(() => this.load(false), 15000);
  }

  ngOnDestroy(): void {
    if (this.refreshHandle) clearInterval(this.refreshHandle);
  }

  load(showSpinner = true): void {
    if (showSpinner) this.loading.set(true);
    this.shipmentService.getAll().subscribe({
      next: (data) => {
        this.shipments.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.friendlyMessage || 'Failed to load shipments.');
        this.loading.set(false);
      }
    });
  }

  statusLabel(status: string): string {
    return status === 'InTransit' ? 'In Transit' : status;
  }
}
