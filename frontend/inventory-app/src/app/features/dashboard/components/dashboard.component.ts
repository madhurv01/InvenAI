import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed } from '@angular/core';
import { DashboardService } from '../services/dashboard.service';
import { DashboardAnalytics, DashboardSummary } from '../../../shared/models/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AiAssistantPanelComponent } from '../../ai/components/ai-assistant-panel.component';

interface HeatmapRow {
  warehouseName: string;
  cells: { categoryName: string; value: number; intensity: number }[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent, AiAssistantPanelComponent],
  template: `
    <div class="page-header fade-in">
      <div>
        <h1>Dashboard</h1>
        <p style="color: var(--color-text-muted); margin: 0;">Real-time overview of your inventory.</p>
      </div>
    </div>

    <app-loading-spinner *ngIf="loading()"></app-loading-spinner>

    <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

    <ng-container *ngIf="!loading() && summary() as s">
      <div class="stat-grid stagger">
        <div class="card card-hover stat-card stat-indigo">
          <div class="stat-icon">📦</div>
          <div class="stat-label">Total Products</div>
          <div class="stat-value">{{ s.totalProducts }}</div>
        </div>
        <div class="card card-hover stat-card stat-emerald">
          <div class="stat-icon">💰</div>
          <div class="stat-label">Inventory Value</div>
          <div class="stat-value">{{ s.totalInventoryValue | currency:'INR':'symbol':'1.0-0' }}</div>
        </div>
        <div class="card card-hover stat-card stat-sky">
          <div class="stat-icon">📥</div>
          <div class="stat-label">Total Units in Stock</div>
          <div class="stat-value">{{ s.totalStockUnits }}</div>
        </div>
        <div class="card card-hover stat-card stat-rose" [class.alert-stat]="s.lowStockCount > 0">
          <div class="stat-icon">⚠️</div>
          <div class="stat-label">Low Stock Products</div>
          <div class="stat-value">{{ s.lowStockCount }}</div>
        </div>
      </div>

      <div class="main-grid">
        <div class="left-col">

          <div class="charts-row" *ngIf="analytics() as a">
            <div class="card card-hover chart-card slide-up">
              <h3>14-Day Movement Trend</h3>
              <svg viewBox="0 0 600 180" class="trend-svg" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#10b981" stop-opacity="0.35"/>
                    <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <line *ngFor="let gy of [0,45,90,135]" [attr.x1]="0" [attr.y1]="gy" [attr.x2]="600" [attr.y2]="gy" stroke="#eef0f6" stroke-width="1"/>
                <path [attr.d]="trendAreaPath(a)" fill="url(#inGrad)"/>
                <path [attr.d]="trendLinePath(a, 'in')" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path [attr.d]="trendLinePath(a, 'out')" fill="none" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="5 4"/>
              </svg>
              <div class="chart-legend">
                <span class="legend-item"><span class="dot" style="background:#10b981"></span>Stock In</span>
                <span class="legend-item"><span class="dot" style="background:#f43f5e"></span>Stock Out</span>
              </div>
            </div>

            <div class="card card-hover chart-card donut-card slide-up">
              <h3>Stock Status</h3>
              <div class="donut-wrap">
                <svg viewBox="0 0 120 120" class="donut-svg">
                  <circle cx="60" cy="60" r="46" fill="none" stroke="#eef0f6" stroke-width="16"/>
                  <circle cx="60" cy="60" r="46" fill="none" stroke="#16a34a" stroke-width="16"
                          [attr.stroke-dasharray]="donutSegment(a, 'in').dash"
                          [attr.stroke-dashoffset]="donutSegment(a, 'in').offset"
                          stroke-linecap="round" transform="rotate(-90 60 60)"/>
                  <circle cx="60" cy="60" r="46" fill="none" stroke="#d97706" stroke-width="16"
                          [attr.stroke-dasharray]="donutSegment(a, 'low').dash"
                          [attr.stroke-dashoffset]="donutSegment(a, 'low').offset"
                          stroke-linecap="round" transform="rotate(-90 60 60)"/>
                  <circle cx="60" cy="60" r="46" fill="none" stroke="#dc2626" stroke-width="16"
                          [attr.stroke-dasharray]="donutSegment(a, 'out').dash"
                          [attr.stroke-dashoffset]="donutSegment(a, 'out').offset"
                          stroke-linecap="round" transform="rotate(-90 60 60)"/>
                  <text x="60" y="56" text-anchor="middle" font-size="20" font-weight="800" fill="var(--color-text)">{{ totalStatusCount(a) }}</text>
                  <text x="60" y="72" text-anchor="middle" font-size="9" fill="var(--color-text-muted)">products</text>
                </svg>
                <div class="donut-legend">
                  <div class="legend-row"><span class="dot" style="background:#16a34a"></span>In Stock <strong>{{ a.stockStatus.inStock }}</strong></div>
                  <div class="legend-row"><span class="dot" style="background:#d97706"></span>Low Stock <strong>{{ a.stockStatus.lowStock }}</strong></div>
                  <div class="legend-row"><span class="dot" style="background:#dc2626"></span>Out of Stock <strong>{{ a.stockStatus.outOfStock }}</strong></div>
                </div>
              </div>
            </div>
          </div>

          <div class="card card-hover slide-up" style="margin-bottom: 20px;" *ngIf="analytics() as a">
            <h3>Warehouse × Category Stock Heatmap</h3>
            <div class="heatmap-wrap" *ngIf="heatmapRows(a).length > 0; else noHeatmap">
              <table class="heatmap-table">
                <thead>
                  <tr>
                    <th></th>
                    <th *ngFor="let cat of heatmapCategories(a)">{{ cat }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of heatmapRows(a)">
                    <td class="row-label">{{ row.warehouseName }}</td>
                    <td *ngFor="let cell of row.cells" class="heat-cell"
                        [style.background]="heatColor(cell.intensity)"
                        [style.color]="cell.intensity > 0.55 ? '#fff' : '#0f172a'"
                        [title]="row.warehouseName + ' × ' + cell.categoryName + ': ' + cell.value + ' units'">
                      {{ cell.value }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ng-template #noHeatmap><div class="empty-state">No inventory data yet.</div></ng-template>
          </div>

          <div class="card card-hover slide-up" style="margin-bottom: 20px;">
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

          <div class="card card-hover slide-up" style="margin-bottom: 20px;">
            <h3>Low Stock Products</h3>
            <div class="empty-state" *ngIf="s.lowStockProducts.length === 0">
              🎉 All products are above minimum stock levels.
            </div>
            <table class="data-table" *ngIf="s.lowStockProducts.length > 0">
              <thead>
                <tr><th>Product</th><th>SKU</th><th>Warehouse</th><th>On Hand</th><th>Minimum</th></tr>
              </thead>
              <tbody class="stagger">
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

          <div class="card card-hover slide-up">
            <h3>Recent Stock Movements</h3>
            <div class="empty-state" *ngIf="s.recentMovements.length === 0">No recent stock movements.</div>
            <table class="data-table" *ngIf="s.recentMovements.length > 0">
              <thead>
                <tr><th>Type</th><th>Product</th><th>Qty</th><th>Warehouse</th><th>When</th></tr>
              </thead>
              <tbody class="stagger">
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
    .stat-card { padding: 18px 20px; position: relative; overflow: hidden; }
    .stat-icon { position: absolute; right: 14px; top: 14px; font-size: 22px; opacity: 0.7; }
    .stat-label { font-size: 12px; color: var(--color-text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
    .stat-value { font-size: 27px; font-weight: 800; margin-top: 6px; font-family: 'Manrope', sans-serif; }
    .alert-stat .stat-value { color: var(--color-danger); }
    .stat-indigo { border-top: 3px solid #6366f1; }
    .stat-emerald { border-top: 3px solid #10b981; }
    .stat-sky { border-top: 3px solid #38bdf8; }
    .stat-rose { border-top: 3px solid #f43f5e; }

    .main-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; align-items: start; }
    @media (max-width: 980px) { .main-grid { grid-template-columns: 1fr; } }

    .charts-row { display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; margin-bottom: 20px; }
    @media (max-width: 720px) { .charts-row { grid-template-columns: 1fr; } }
    .chart-card h3 { margin-bottom: 12px; }
    .trend-svg { width: 100%; height: 160px; }
    .chart-legend { display: flex; gap: 16px; margin-top: 8px; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--color-text-muted); }
    .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }

    .donut-wrap { display: flex; align-items: center; gap: 18px; }
    .donut-svg { width: 120px; height: 120px; flex-shrink: 0; }
    .donut-legend { display: flex; flex-direction: column; gap: 8px; }
    .legend-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-muted); }
    .legend-row strong { color: var(--color-text); margin-left: auto; }

    .heatmap-wrap { overflow-x: auto; }
    .heatmap-table { border-collapse: separate; border-spacing: 4px; width: 100%; }
    .heatmap-table th { font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.03em; padding: 4px 8px; }
    .row-label { font-size: 12.5px; font-weight: 600; white-space: nowrap; padding-right: 10px; }
    .heat-cell {
      min-width: 56px; text-align: center; padding: 10px 6px; border-radius: 8px;
      font-size: 12.5px; font-weight: 700; color: #0f172a; transition: transform 0.15s ease;
    }
    .heat-cell:hover { transform: scale(1.08); }

    .chart-row { display: grid; grid-template-columns: 140px 1fr 100px; align-items: center; gap: 10px; margin-bottom: 10px; }
    .chart-label { font-size: 13px; color: var(--color-text); }
    .chart-bar-track { background: #f3f4f6; border-radius: 6px; height: 10px; overflow: hidden; }
    .chart-bar { background: linear-gradient(90deg, var(--color-primary), var(--color-primary-dark)); height: 100%; border-radius: 6px; transition: width 0.5s var(--ease-out); }
    .chart-value { font-size: 12px; text-align: right; color: var(--color-text-muted); }
  `]
})
export class DashboardComponent implements OnInit {
  summary = signal<DashboardSummary | null>(null);
  analytics = signal<DashboardAnalytics | null>(null);
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

    this.dashboardService.getAnalytics().subscribe({
      next: (data) => this.analytics.set(data),
      error: () => {} // analytics is a progressive enhancement — summary already renders without it
    });
  }

  barWidth(value: number, all: { inventoryValue: number }[]): number {
    const max = Math.max(...all.map(c => c.inventoryValue), 1);
    return Math.max((value / max) * 100, 3);
  }

  // ---------- Trend line chart ----------
  private trendPoints(a: DashboardAnalytics, key: 'stockIn' | 'stockOut'): { x: number; y: number }[] {
    const points = a.movementTrend;
    const max = Math.max(...points.map(p => Math.max(p.stockIn, p.stockOut)), 1);
    const stepX = points.length > 1 ? 600 / (points.length - 1) : 600;
    return points.map((p, i) => ({
      x: i * stepX,
      y: 170 - (p[key] / max) * 150
    }));
  }

  trendLinePath(a: DashboardAnalytics, series: 'in' | 'out'): string {
    const pts = this.trendPoints(a, series === 'in' ? 'stockIn' : 'stockOut');
    if (pts.length === 0) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }

  trendAreaPath(a: DashboardAnalytics): string {
    const pts = this.trendPoints(a, 'stockIn');
    if (pts.length === 0) return '';
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const last = pts[pts.length - 1];
    return `${line} L ${last.x.toFixed(1)} 170 L 0 170 Z`;
  }

  // ---------- Donut chart ----------
  totalStatusCount(a: DashboardAnalytics): number {
    return a.stockStatus.inStock + a.stockStatus.lowStock + a.stockStatus.outOfStock;
  }

  donutSegment(a: DashboardAnalytics, key: 'in' | 'low' | 'out'): { dash: string; offset: number } {
    const r = 46;
    const circumference = 2 * Math.PI * r;
    const total = this.totalStatusCount(a) || 1;
    const values = { in: a.stockStatus.inStock, low: a.stockStatus.lowStock, out: a.stockStatus.outOfStock };
    const order: ('in' | 'low' | 'out')[] = ['in', 'low', 'out'];
    let offsetSoFar = 0;
    for (const k of order) {
      if (k === key) break;
      offsetSoFar += (values[k] / total) * circumference;
    }
    const segmentLength = (values[key] / total) * circumference;
    return {
      dash: `${segmentLength.toFixed(1)} ${(circumference - segmentLength).toFixed(1)}`,
      offset: -offsetSoFar
    };
  }

  // ---------- Heatmap ----------
  heatmapCategories(a: DashboardAnalytics): string[] {
    return Array.from(new Set(a.heatmap.map(c => c.categoryName))).sort();
  }

  heatmapRows(a: DashboardAnalytics): HeatmapRow[] {
    const categories = this.heatmapCategories(a);
    const warehouses = Array.from(new Set(a.heatmap.map(c => c.warehouseName))).sort();
    const max = Math.max(...a.heatmap.map(c => c.quantityOnHand), 1);

    return warehouses.map(wh => ({
      warehouseName: wh,
      cells: categories.map(cat => {
        const match = a.heatmap.find(c => c.warehouseName === wh && c.categoryName === cat);
        const value = match?.quantityOnHand ?? 0;
        return { categoryName: cat, value, intensity: value / max };
      })
    }));
  }

  heatColor(intensity: number): string {
    // Light indigo (low) -> deep indigo (high)
    const from = { r: 238, g: 242, b: 255 };
    const to = { r: 79, g: 70, b: 229 };
    const r = Math.round(from.r + (to.r - from.r) * intensity);
    const g = Math.round(from.g + (to.g - from.g) * intensity);
    const b = Math.round(from.b + (to.b - from.b) * intensity);
    return `rgb(${r} ${g} ${b})`;
  }
}
