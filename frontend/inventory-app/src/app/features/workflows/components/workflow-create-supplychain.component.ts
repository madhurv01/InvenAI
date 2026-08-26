import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkflowService } from '../services/workflow.service';
import { ProductService } from '../../products/services/product.service';
import { WarehouseService } from '../../warehouses/services/warehouse.service';
import { Product, WarehouseManage } from '../../../shared/models/models';
import { WorkflowNodeComponent } from './workflow-node.component';

@Component({
  selector: 'app-workflow-create-supplychain',
  standalone: true,
  imports: [CommonModule, FormsModule, WorkflowNodeComponent],
  template: `
    <div class="page-header fade-in">
      <div>
        <h1>🔗 New Supply Chain Workflow</h1>
        <p style="color: var(--color-text-muted); margin: 0;">Continuously monitor a product's stock and shipments at a warehouse.</p>
      </div>
      <button class="btn btn-secondary" (click)="router.navigate(['/workflows'])">← Back to Workflows</button>
    </div>

    <div class="card wizard-card slide-up">
      <app-workflow-node [stepNumber]="1" title="Select Product" icon="🏷️"
        [state]="step() === 1 ? 'active' : (step() > 1 ? 'done' : 'pending')"
        [summary]="step() > 1 ? productName() : ''" [isLast]="false">
        <select class="form-control" [(ngModel)]="productId">
          <option [ngValue]="null">Select a product…</option>
          <option *ngFor="let p of products()" [ngValue]="p.id">{{ p.name }} ({{ p.sku }})</option>
        </select>
        <button class="btn btn-primary next-btn" [disabled]="!productId" (click)="goTo(2)">Next →</button>
      </app-workflow-node>

      <app-workflow-node [stepNumber]="2" title="Select Warehouse" icon="🏭"
        [state]="step() === 2 ? 'active' : (step() > 2 ? 'done' : 'pending')"
        [summary]="step() > 2 ? warehouseName() : ''" [isLast]="false">
        <select class="form-control" [(ngModel)]="warehouseId">
          <option [ngValue]="null">Select a warehouse…</option>
          <option *ngFor="let w of warehouses()" [ngValue]="w.id">{{ w.name }}{{ w.location ? ' — ' + w.location : '' }}</option>
        </select>
        <div class="btn-row">
          <button class="btn btn-secondary" (click)="goTo(1)">← Back</button>
          <button class="btn btn-primary next-btn" [disabled]="!warehouseId" (click)="goTo(3)">Next →</button>
        </div>
      </app-workflow-node>

      <app-workflow-node [stepNumber]="3" title="Set Threshold" icon="📉"
        [state]="step() === 3 ? 'active' : (step() > 3 ? 'done' : 'pending')"
        [summary]="step() > 3 ? ('Alert when quantity < ' + thresholdQuantity) : ''" [isLast]="false">
        <label class="field-label">Alert when quantity on hand drops below:</label>
        <input type="number" min="1" class="form-control" [(ngModel)]="thresholdQuantity" placeholder="e.g. 20" />
        <div class="btn-row">
          <button class="btn btn-secondary" (click)="goTo(2)">← Back</button>
          <button class="btn btn-primary next-btn" [disabled]="!thresholdQuantity || thresholdQuantity < 1" (click)="goTo(4)">Next →</button>
        </div>
      </app-workflow-node>

      <app-workflow-node [stepNumber]="4" title="Configure Email" icon="📧"
        [state]="step() === 4 ? 'active' : (step() > 4 ? 'done' : 'pending')"
        [summary]="step() > 4 ? recipientEmail : ''" [isLast]="false">
        <label class="field-label">Send stock and shipment updates to:</label>
        <input type="email" class="form-control" [(ngModel)]="recipientEmail" placeholder="you@example.com" />
        <div class="btn-row">
          <button class="btn btn-secondary" (click)="goTo(3)">← Back</button>
          <button class="btn btn-primary next-btn" [disabled]="!isValidEmail(recipientEmail)" (click)="goTo(5)">Next →</button>
        </div>
      </app-workflow-node>

      <app-workflow-node [stepNumber]="5" title="Review & Activate" icon="🚀"
        [state]="step() === 5 ? 'active' : 'pending'" [isLast]="true">
        <label class="field-label">Workflow name</label>
        <input class="form-control" [(ngModel)]="name" placeholder="e.g. Monitor Bluetooth Speaker at Main Warehouse" />

        <div class="review-box">
          <div class="review-row"><span>Product</span><strong>{{ productName() }}</strong></div>
          <div class="review-row"><span>Warehouse</span><strong>{{ warehouseName() }}</strong></div>
          <div class="review-row"><span>Threshold</span><strong>&lt; {{ thresholdQuantity }} units</strong></div>
          <div class="review-row"><span>Recipient</span><strong>{{ recipientEmail }}</strong></div>
        </div>
        <p class="hint">This workflow emails you on low stock <em>and</em> whenever a shipment carrying this product (from this warehouse) is delivered or cancelled.</p>

        <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

        <div class="btn-row">
          <button class="btn btn-secondary" (click)="goTo(4)">← Back</button>
          <button class="btn btn-primary next-btn" [disabled]="!name.trim() || submitting()" (click)="submit()">
            {{ submitting() ? 'Activating…' : '⚡ Activate Workflow' }}
          </button>
        </div>
      </app-workflow-node>
    </div>
  `,
  styles: [`
    .wizard-card { max-width: 640px; padding: 24px; }
    .field-label { font-size: 12.5px; font-weight: 700; color: var(--color-text); display: block; margin-bottom: 8px; }
    .hint { font-size: 12px; color: var(--color-text-muted); margin: 10px 0 0; line-height: 1.5; }
    .next-btn { margin-top: 12px; }
    .btn-row { display: flex; gap: 8px; margin-top: 12px; }
    .btn-row .btn { flex: 1; }

    .review-box { background: #f9fafb; border-radius: 10px; padding: 12px 14px; margin: 14px 0; display: flex; flex-direction: column; gap: 6px; }
    .review-row { display: flex; justify-content: space-between; font-size: 12.5px; }
    .review-row span { color: var(--color-text-muted); }
  `]
})
export class WorkflowCreateSupplyChainComponent implements OnInit {
  products = signal<Product[]>([]);
  warehouses = signal<WarehouseManage[]>([]);
  step = signal(1);
  submitting = signal(false);
  errorMessage = signal('');

  productId: string | null = null;
  warehouseId: string | null = null;
  thresholdQuantity: number | null = null;
  recipientEmail = '';
  name = '';

  constructor(
    private workflowService: WorkflowService,
    private productService: ProductService,
    private warehouseService: WarehouseService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.productService.getAll({ pageSize: 500 }).subscribe({ next: (r) => this.products.set(r.items), error: () => {} });
    this.warehouseService.getAll().subscribe({ next: (w) => this.warehouses.set(w), error: () => {} });
  }

  goTo(step: number): void {
    this.step.set(step);
  }

  productName(): string {
    return this.products().find(p => p.id === this.productId)?.name || '';
  }

  warehouseName(): string {
    return this.warehouses().find(w => w.id === this.warehouseId)?.name || '';
  }

  isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  submit(): void {
    if (!this.productId || !this.warehouseId || !this.thresholdQuantity || !this.isValidEmail(this.recipientEmail) || !this.name.trim()) return;
    this.submitting.set(true);
    this.errorMessage.set('');

    this.workflowService.createSupplyChain({
      name: this.name.trim(),
      productId: this.productId,
      warehouseId: this.warehouseId,
      thresholdQuantity: this.thresholdQuantity,
      recipientEmail: this.recipientEmail.trim()
    }).subscribe({
      next: (wf) => this.router.navigate(['/workflows', wf.id]),
      error: (err) => {
        this.errorMessage.set(err.friendlyMessage || 'Failed to create workflow.');
        this.submitting.set(false);
      }
    });
  }
}
