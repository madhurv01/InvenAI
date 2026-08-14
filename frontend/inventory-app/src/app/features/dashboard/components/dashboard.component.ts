import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { DashboardService } from '../services/dashboard.service';
import { DashboardSummary } from '../../../shared/models/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AiAssistantPanelComponent } from '../../ai/components/ai-assistant-panel.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent, AiAssistantPanelComponent],
  template: `
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p style="color: var(--color-text-muted); margin: 0;">Real-time overview of your inventory.</p>
      </div>
    </div>

    <app-loading-spinner *ngIf="loading()"></app-loading-spinner>

    <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

    <ng-container *ngIf="!loading() && summary() as s">
      <div class="stat-grid">
        <div class="card stat-card">
          <div class="stat-label">Total Products</div>
          <div class="stat-value">{{ s.totalProducts }}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Inventory Value</div>
          <div class="stat-value">{{ s.totalInventoryValue | currency:'INR':'symbol':'1.0-0' }}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Total Units in Stock</div>
          <div class="stat-value">{{ s.totalStockUnits }}</div>
        </div>
        <div class="card stat-card" [class.alert-stat]="s.lowStockCount > 0">
          <div class="stat-label">Low Stock Products</div>
          <div class="stat-value">{{ s.lowStockCount }}</div>
        </div>
      </div>

      <div class="main-grid">
        <div class="left-col">
          <div class="card" style="margin-bottom: 20px;">
            <h3>Inventory Value by Category</h3>
            <div class="chart" *ngIf="s.categoryBreakdown.length > 0; else noCategoryData">
              <div class="chart-row" *ngFor="let c of s.categoryBreakdown">
                <div class="chart-label">{{ c.categoryName }}</div>
                <div class="chart-bar-track">
                  <div class="chart-bar" [style.width.%]="barWidth(c.inventoryValue, s.categoryBreakdown)"></div>
                </div>
                <div class="chart-value">{{ c.inventoryValue | currency:'INR':'symbol':'1.0-0' }}</div>
              </div>
            </div>
            <ng-template #noCategoryData>
              <div class="empty-state">No category data yet.</div>
            </ng-template>
          </div>

          <div class="card" style="margin-bottom: 20px;">
            <h3>Low Stock Products</h3>
            <div class="empty-state" *ngIf="s.lowStockProducts.length === 0">
              🎉 All products are above minimum stock levels.
            </div>
            <table class="data-table" *ngIf="s.lowStockProducts.length > 0">
              <thead>
                <tr><th>Product</th><th>SKU</th><th>Warehouse</th><th>On Hand</th><th>Minimum</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of s.lowStockProducts">
                  <td>{{ item.productName }}</td>
                  <td>{{ item.sku }}</td>
                  <td>{{ item.warehouseName }}</td>
                  <td><span class="badge badge-danger">{{ item.quantityOnHand }}</span></td>
                  <td>{{ item.minimumStockLevel }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="card">
            <h3>Recent Stock Movements</h3>
            <div class="empty-state" *ngIf="s.recentMovements.length === 0">No recent stock movements.</div>
            <table class="data-table" *ngIf="s.recentMovements.length > 0">
              <thead>
                <tr><th>Type</th><th>Product</th><th>Qty</th><th>Warehouse</th><th>When</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let m of s.recentMovements">
                  <td>
                    <span class="badge"
                          [class.badge-success]="m.movementType === 'IN'"
                          [class.badge-danger]="m.movementType === 'OUT'"
                          [class.badge-neutral]="m.movementType === 'ADJUSTMENT'">
                      {{ m.movementType }}
                    </span>
                  </td>
                  <td>{{ m.productName }} <span style="color:var(--color-text-muted)">({{ m.sku }})</span></td>
                  <td>{{ m.quantity }}</td>
                  <td>{{ m.warehouseName }}</td>
                  <td>{{ m.createdAt | date:'short' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="right-col">
          <app-ai-assistant-panel></app-ai-assistant-panel>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    .stat-card { padding: 18px 20px; }
    .stat-label { font-size: 12px; color: var(--color-text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.03em; }
    .stat-value { font-size: 26px; font-weight: 700; margin-top: 6px; }
    .alert-stat .stat-value { color: var(--color-danger); }
    .main-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; align-items: start; }
    @media (max-width: 980px) { .main-grid { grid-template-columns: 1fr; } }
    .chart-row { display: grid; grid-template-columns: 140px 1fr 100px; align-items: center; gap: 10px; margin-bottom: 10px; }
    .chart-label { font-size: 13px; color: var(--color-text); }
    .chart-bar-track { background: #f3f4f6; border-radius: 6px; height: 10px; overflow: hidden; }
    .chart-bar { background: var(--color-primary); height: 100%; border-radius: 6px; }
    .chart-value { font-size: 12px; text-align: right; color: var(--color-text-muted); }
  `]
})
export class DashboardComponent implements OnInit {
  summary = signal<DashboardSummary | null>(null);
  loading = signal(true);
  errorMessage = signal('');

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.dashboardService.getSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.friendlyMessage || 'Failed to load dashboard data.');
        this.loading.set(false);
      }
    });
  }

  barWidth(value: number, all: { inventoryValue: number }[]): number {
    const max = Math.max(...all.map(c => c.inventoryValue), 1);
    return Math.max((value / max) * 100, 3);
  }
}
