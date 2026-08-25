import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PackageOrderService } from '../services/package-order.service';
import { PackageOrderDetail } from '../../../shared/models/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-package-order-detail',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent],
  template: `
    <div class="page-header fade-in">
      <div>
        <h1>{{ order()?.orderNumber || 'Package Order' }}</h1>
        <p style="color: var(--color-text-muted); margin: 0;">{{ order()?.warehouseName }}</p>
      </div>
      <button class="btn btn-secondary" (click)="router.navigate(['/package-orders'])">← Back to Package Orders</button>
    </div>

    <app-loading-spinner *ngIf="loading()"></app-loading-spinner>
    <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

    <ng-container *ngIf="!loading() && order() as o">
      <div class="detail-layout slide-up">
        <div class="card items-card">
          <div class="status-row">
            <span class="badge badge-lg"
                  [class.badge-neutral]="o.status === 'Pending'"
                  [class.badge-success]="o.status === 'Shipped'"
                  [class.badge-danger]="o.status === 'Cancelled'">
              {{ o.status }}
            </span>
            <span class="badge" [class.badge-danger]="o.priority === 'High'" [class.badge-neutral]="o.priority === 'Normal'" [class.badge-info]="o.priority === 'Low'">
              {{ o.priority }} priority
            </span>
          </div>

          <h3>Line Items</h3>
          <table class="data-table">
            <thead>
              <tr><th>Product</th><th>SKU</th><th>Qty</th><th>Customization</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of o.items">
                <td>{{ item.productName }}</td>
                <td>{{ item.sku }}</td>
                <td><span class="badge badge-neutral">{{ item.quantity }}</span></td>
                <td class="note-cell">{{ item.customizationNote || '—' }}</td>
              </tr>
            </tbody>
          </table>

          <div class="note-block" *ngIf="o.notes">
            <div class="field-label">Notes</div>
            <p>{{ o.notes }}</p>
          </div>
        </div>

        <div class="side-panel">
          <div class="card">
            <h3>Details</h3>
            <dl>
              <dt>Warehouse</dt><dd>{{ o.warehouseName }}</dd>
              <dt>Expected Ship</dt><dd>{{ o.expectedShipDate ? (o.expectedShipDate | date:'MMM d, y') : '—' }}</dd>
              <dt>Created</dt><dd>{{ o.createdAt | date:'MMM d, y, h:mm a' }}</dd>
              <dt *ngIf="o.shippedAt">Shipped At</dt><dd *ngIf="o.shippedAt">{{ o.shippedAt | date:'MMM d, y, h:mm a' }}</dd>
              <dt *ngIf="o.cancelledAt">Cancelled At</dt><dd *ngIf="o.cancelledAt">{{ o.cancelledAt | date:'MMM d, y, h:mm a' }}</dd>
            </dl>
          </div>

          <div class="card" *ngIf="o.status === 'Shipped' && o.shipmentOrderNumber">
            <h3>Shipment</h3>
            <p style="font-size:13px; margin: 0 0 12px;">This order shipped as <strong>{{ o.shipmentOrderNumber }}</strong>.</p>
            <button class="btn btn-primary btn-sm" style="width:100%" (click)="router.navigate(['/shipments', o.shipmentId])">Track Shipment</button>
          </div>

          <div class="card" *ngIf="o.status === 'Pending'">
            <h3>Actions</h3>
            <button class="btn btn-primary btn-sm action-btn" (click)="router.navigate(['/shipments/new'], { queryParams: { packageOrderId: o.id } })">
              🚢 Ship this Order
            </button>
            <button class="btn btn-danger btn-sm action-btn" [disabled]="cancelling()" (click)="cancel()">
              {{ cancelling() ? 'Cancelling…' : 'Cancel Order' }}
            </button>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .detail-layout { display: grid; grid-template-columns: 1fr 300px; gap: 20px; align-items: start; }
    @media (max-width: 900px) { .detail-layout { grid-template-columns: 1fr; } }

    .items-card { padding: 20px; }
    .status-row { display: flex; gap: 8px; margin-bottom: 18px; }
    .badge-lg { font-size: 13px; padding: 6px 14px; }
    .badge-info { background: #e0e7ff; color: #4338ca; }
    .note-cell { font-size: 12.5px; color: var(--color-text-muted); max-width: 240px; }
    .note-block { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--color-border); }
    .note-block p { font-size: 13px; margin: 6px 0 0; }
    .field-label { font-size: 11.5px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.03em; }

    .side-panel { display: flex; flex-direction: column; gap: 16px; }
    .side-panel h3 { margin-bottom: 12px; font-size: 14px; }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 8px 12px; margin: 0; }
    dt { font-size: 11.5px; color: var(--color-text-muted); font-weight: 600; white-space: nowrap; }
    dd { margin: 0; font-size: 12.5px; text-align: right; }

    .action-btn { width: 100%; margin-bottom: 8px; }
    .action-btn:last-child { margin-bottom: 0; }
  `]
})
export class PackageOrderDetailComponent implements OnInit {
  order = signal<PackageOrderDetail | null>(null);
  loading = signal(true);
  errorMessage = signal('');
  cancelling = signal(false);

  private id!: string;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private packageOrderService: PackageOrderService
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.packageOrderService.getById(this.id).subscribe({
      next: (o) => {
        this.order.set(o);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.friendlyMessage || 'Failed to load package order.');
        this.loading.set(false);
      }
    });
  }

  cancel(): void {
    this.cancelling.set(true);
    this.packageOrderService.cancel(this.id).subscribe({
      next: (o) => {
        this.order.set(o);
        this.cancelling.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.friendlyMessage || 'Failed to cancel package order.');
        this.cancelling.set(false);
      }
    });
  }
}
