import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PackageOrderService } from '../services/package-order.service';
import { PackageOrderSummary } from '../../../shared/models/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-package-order-list',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent],
  template: `
    <div class="page-header fade-in">
      <div>
        <h1>Package Orders</h1>
        <p style="color: var(--color-text-muted); margin: 0;">Pack products from a warehouse, ready to hand off to a shipment.</p>
      </div>
      <button class="btn btn-primary" (click)="router.navigate(['/package-orders/new'])">+ New Package Order</button>
    </div>

    <app-loading-spinner *ngIf="loading()"></app-loading-spinner>
    <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

    <div class="card slide-up" *ngIf="!loading()">
      <div class="empty-state" *ngIf="orders().length === 0">
        No package orders yet. Create one to reserve stock and hand it off to a shipment.
      </div>

      <div style="overflow-x:auto" *ngIf="orders().length > 0">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Warehouse</th>
              <th>Items</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Expected Ship</th>
              <th>Shipment</th>
              <th></th>
            </tr>
          </thead>
          <tbody class="stagger">
            <tr *ngFor="let o of orders()" class="clickable-row" (click)="router.navigate(['/package-orders', o.id])">
              <td><strong>{{ o.orderNumber }}</strong></td>
              <td>{{ o.warehouseName }}</td>
              <td>{{ o.itemCount }} line(s) · {{ o.totalQuantity }} units</td>
              <td>
                <span class="badge" [class.badge-danger]="o.priority === 'High'" [class.badge-neutral]="o.priority === 'Normal'" [class.badge-info]="o.priority === 'Low'">
                  {{ o.priority }}
                </span>
              </td>
              <td>
                <span class="badge"
                      [class.badge-neutral]="o.status === 'Pending'"
                      [class.badge-success]="o.status === 'Shipped'"
                      [class.badge-danger]="o.status === 'Cancelled'">
                  {{ o.status }}
                </span>
              </td>
              <td>{{ o.expectedShipDate ? (o.expectedShipDate | date:'MMM d, y') : '—' }}</td>
              <td>{{ o.shipmentOrderNumber || '—' }}</td>
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
    .badge-info { background: #e0e7ff; color: #4338ca; }
    .chevron { color: var(--color-text-muted); font-size: 16px; }
  `]
})
export class PackageOrderListComponent implements OnInit {
  orders = signal<PackageOrderSummary[]>([]);
  loading = signal(true);
  errorMessage = signal('');

  constructor(private packageOrderService: PackageOrderService, public router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.packageOrderService.getAll().subscribe({
      next: (data) => {
        this.orders.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.friendlyMessage || 'Failed to load package orders.');
        this.loading.set(false);
      }
    });
  }
}
