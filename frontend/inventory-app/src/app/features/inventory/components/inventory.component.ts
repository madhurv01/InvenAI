import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryItem, Product, StockMovement, Warehouse } from '../../../shared/models/models';
import { InventoryService } from '../services/inventory.service';
import { ProductService } from '../../products/services/product.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { StockMovementFormComponent } from './stock-movement-form.component';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent, StockMovementFormComponent],
  template: `
    <div class="page-header">
      <div>
        <h1>Inventory &amp; Stock</h1>
        <p style="color: var(--color-text-muted); margin:0;">Track stock levels and movement history across warehouses.</p>
      </div>
      <button class="btn btn-primary" (click)="showMovementForm.set(true)">+ Record Movement</button>
    </div>

    <div class="tabs">
      <button class="tab" [class.active]="activeTab() === 'stock'" (click)="switchTab('stock')">Current Stock</button>
      <button class="tab" [class.active]="activeTab() === 'history'" (click)="switchTab('history')">Movement History</button>
    </div>

    <div class="toolbar card">
      <select class="form-control" style="max-width:220px" [(ngModel)]="warehouseFilter" (ngModelChange)="reload()">
        <option value="">All Warehouses</option>
        <option *ngFor="let w of warehouses()" [ngValue]="w.id">{{ w.name }}</option>
      </select>
      <label style="display:flex; align-items:center; gap:6px; font-size:13px;" *ngIf="activeTab() === 'stock'">
        <input type="checkbox" [(ngModel)]="lowStockOnly" (ngModelChange)="reload()" />
        Low stock only
      </label>
    </div>

    <app-loading-spinner *ngIf="loading()"></app-loading-spinner>
    <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

    <div class="card" *ngIf="!loading() && activeTab() === 'stock'">
      <div class="empty-state" *ngIf="stock().length === 0">No stock records match your filters.</div>
      <table class="data-table" *ngIf="stock().length > 0">
        <thead>
          <tr><th>Product</th><th>SKU</th><th>Warehouse</th><th>On Hand</th><th>Minimum</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of stock()">
            <td>{{ item.productName }}</td>
            <td>{{ item.sku }}</td>
            <td>{{ item.warehouseName }}</td>
            <td>{{ item.quantityOnHand }}</td>
            <td>{{ item.minimumStockLevel }}</td>
            <td>
              <span class="badge" [class.badge-danger]="item.isLowStock" [class.badge-success]="!item.isLowStock">
                {{ item.isLowStock ? 'Low Stock' : 'OK' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card" *ngIf="!loading() && activeTab() === 'history'">
      <div class="empty-state" *ngIf="movements().length === 0">No stock movement history yet.</div>
      <table class="data-table" *ngIf="movements().length > 0">
        <thead>
          <tr><th>Type</th><th>Product</th><th>Qty</th><th>Warehouse</th><th>Reason</th><th>By</th><th>When</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let m of movements()">
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
            <td>{{ m.reason || '—' }}</td>
            <td>{{ m.performedBy || '—' }}</td>
            <td>{{ m.createdAt | date:'short' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <app-stock-movement-form
      *ngIf="showMovementForm()"
      [products]="products()"
      [warehouses]="warehouses()"
      (close)="showMovementForm.set(false)"
      (saved)="onMovementSaved()">
    </app-stock-movement-form>
  `,
  styles: [`
    .tabs { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid var(--color-border); }
    .tab {
      background: none; border: none; padding: 10px 16px; font-size: 14px; font-weight: 500;
      color: var(--color-text-muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px;
    }
    .tab.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }
  `]
})
export class InventoryComponent implements OnInit {
  activeTab = signal<'stock' | 'history'>('stock');
  stock = signal<InventoryItem[]>([]);
  movements = signal<StockMovement[]>([]);
  warehouses = signal<Warehouse[]>([]);
  products = signal<Product[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  showMovementForm = signal(false);

  warehouseFilter = '';
  lowStockOnly = false;

  constructor(private inventoryService: InventoryService, private productService: ProductService) {}

  ngOnInit(): void {
    this.inventoryService.getWarehouses().subscribe(w => this.warehouses.set(w));
    this.productService.getAll().subscribe(p => this.products.set(p));
    this.reload();
  }

  switchTab(tab: 'stock' | 'history'): void {
    this.activeTab.set(tab);
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    if (this.activeTab() === 'stock') {
      this.inventoryService.getStock({
        warehouseId: this.warehouseFilter || undefined,
        lowStockOnly: this.lowStockOnly || undefined
      }).subscribe({
        next: (data) => { this.stock.set(data); this.loading.set(false); },
        error: (err) => { this.errorMessage.set(err.friendlyMessage || 'Failed to load stock.'); this.loading.set(false); }
      });
    } else {
      this.inventoryService.getMovementHistory({
        warehouseId: this.warehouseFilter || undefined,
        take: 100
      }).subscribe({
        next: (data) => { this.movements.set(data); this.loading.set(false); },
        error: (err) => { this.errorMessage.set(err.friendlyMessage || 'Failed to load movement history.'); this.loading.set(false); }
      });
    }
  }

  onMovementSaved(): void {
    this.showMovementForm.set(false);
    this.reload();
  }
}
