import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PackageOrderService } from '../services/package-order.service';
import { ProductService } from '../../products/services/product.service';
import { WarehouseService } from '../../warehouses/services/warehouse.service';
import { CreatePackageOrderItemRequest, PackageOrderPriority, Product, WarehouseManage } from '../../../shared/models/models';

interface DraftLine {
  productId: string;
  quantity: number;
  customizationNote: string;
}

@Component({
  selector: 'app-package-order-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header fade-in">
      <div>
        <h1>New Package Order</h1>
        <p style="color: var(--color-text-muted); margin: 0;">Reserve products from a warehouse for an upcoming shipment.</p>
      </div>
      <button class="btn btn-secondary" (click)="router.navigate(['/package-orders'])">← Back to Package Orders</button>
    </div>

    <div class="card form-card slide-up">
      <div class="form-row">
        <div class="field">
          <label class="field-label">Warehouse</label>
          <select class="form-control" [(ngModel)]="warehouseId">
            <option [ngValue]="null">Select a warehouse…</option>
            <option *ngFor="let w of warehouses()" [ngValue]="w.id">{{ w.name }}{{ w.location ? ' — ' + w.location : '' }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">Priority</label>
          <select class="form-control" [(ngModel)]="priority">
            <option value="Low">Low</option>
            <option value="Normal">Normal</option>
            <option value="High">High</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">Expected Ship Date (optional)</label>
          <input type="date" class="form-control" [(ngModel)]="expectedShipDate" />
        </div>
      </div>

      <div class="field">
        <label class="field-label">Notes (optional)</label>
        <textarea class="form-control" rows="2" [(ngModel)]="notes" placeholder="Any special handling notes for this order…"></textarea>
      </div>

      <h3 class="section-title">Line Items</h3>
      <p class="hint" *ngIf="!warehouseId">Select a warehouse first to see available stock.</p>

      <div class="line-items" *ngIf="warehouseId">
        <div class="line-item card" *ngFor="let line of lines(); let i = index">
          <div class="line-row">
            <select class="form-control" [(ngModel)]="line.productId" [ngModelOptions]="{standalone: true}">
              <option [ngValue]="''">Select a product…</option>
              <option *ngFor="let p of products()" [ngValue]="p.id">{{ p.name }} ({{ p.sku }})</option>
            </select>
            <input type="number" min="1" class="form-control qty-input" [(ngModel)]="line.quantity" [ngModelOptions]="{standalone: true}" placeholder="Qty" />
            <button class="btn btn-danger btn-sm" (click)="removeLine(i)" title="Remove line">✕</button>
          </div>
          <input
            class="form-control tallied-input"
            [(ngModel)]="line.customizationNote"
            [ngModelOptions]="{standalone: true}"
            placeholder="Customization note (optional) — e.g. blue, engraved, gift-wrapped… (tallied product)" />
        </div>

        <button class="btn btn-secondary add-line-btn" (click)="addLine()">+ Add Line Item</button>
      </div>

      <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

      <button class="btn btn-primary submit-btn" [disabled]="!canSubmit() || submitting()" (click)="submit()">
        {{ submitting() ? 'Creating package order…' : 'Create Package Order' }}
      </button>
    </div>
  `,
  styles: [`
    .form-card { max-width: 780px; padding: 24px; }
    .form-row { display: grid; grid-template-columns: 1fr 160px 200px; gap: 16px; margin-bottom: 6px; }
    @media (max-width: 700px) { .form-row { grid-template-columns: 1fr; } }
    .field { margin-bottom: 14px; }
    .field-label { font-size: 12.5px; font-weight: 700; color: var(--color-text); display: block; margin-bottom: 6px; }
    .section-title { margin: 22px 0 4px; font-size: 15px; }
    .hint { font-size: 12.5px; color: var(--color-text-muted); margin: 8px 0 0; }

    .line-items { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
    .line-item { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
    .line-row { display: grid; grid-template-columns: 1fr 90px auto; gap: 8px; align-items: center; }
    .qty-input { text-align: center; }
    .tallied-input { font-size: 12.5px; }

    .add-line-btn { align-self: flex-start; margin-top: 4px; }
    .submit-btn { margin-top: 22px; width: 100%; }
  `]
})
export class PackageOrderCreateComponent implements OnInit {
  warehouses = signal<WarehouseManage[]>([]);
  products = signal<Product[]>([]);

  warehouseId: string | null = null;
  priority: PackageOrderPriority = 'Normal';
  expectedShipDate = '';
  notes = '';

  lines = signal<DraftLine[]>([{ productId: '', quantity: 1, customizationNote: '' }]);

  submitting = signal(false);
  errorMessage = signal('');

  constructor(
    private packageOrderService: PackageOrderService,
    private productService: ProductService,
    private warehouseService: WarehouseService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.warehouseService.getAll().subscribe({ next: (w) => this.warehouses.set(w), error: () => {} });
    this.productService.getAll({ pageSize: 500 }).subscribe({
      next: (res) => this.products.set(res.items),
      error: () => {}
    });
  }

  addLine(): void {
    this.lines.update(l => [...l, { productId: '', quantity: 1, customizationNote: '' }]);
  }

  removeLine(index: number): void {
    this.lines.update(l => l.filter((_, i) => i !== index));
  }

  canSubmit(): boolean {
    if (!this.warehouseId || this.submitting()) return false;
    const valid = this.lines().filter(l => l.productId && l.quantity > 0);
    return valid.length > 0;
  }

  submit(): void {
    if (!this.canSubmit()) return;
    this.submitting.set(true);
    this.errorMessage.set('');

    const items: CreatePackageOrderItemRequest[] = this.lines()
      .filter(l => l.productId && l.quantity > 0)
      .map(l => ({
        productId: l.productId,
        quantity: Number(l.quantity),
        customizationNote: l.customizationNote.trim() || undefined
      }));

    this.packageOrderService.create({
      warehouseId: this.warehouseId!,
      priority: this.priority,
      notes: this.notes.trim() || undefined,
      expectedShipDate: this.expectedShipDate || undefined,
      items
    }).subscribe({
      next: (order) => this.router.navigate(['/package-orders', order.id]),
      error: (err) => {
        this.errorMessage.set(err.friendlyMessage || 'Failed to create package order.');
        this.submitting.set(false);
      }
    });
  }
}
