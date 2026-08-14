import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateStockMovementRequest, Product, Warehouse } from '../../../shared/models/models';
import { InventoryService } from '../services/inventory.service';

@Component({
  selector: 'app-stock-movement-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-card card" (click)="$event.stopPropagation()">
        <h2>Record Stock Movement</h2>

        <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="form-group">
            <label class="form-label">Product *</label>
            <select class="form-control" formControlName="productId">
              <option [ngValue]="null">Select a product…</option>
              <option *ngFor="let p of products" [ngValue]="p.id">{{ p.name }} ({{ p.sku }})</option>
            </select>
            <div class="form-error" *ngIf="submitted() && form.get('productId')?.invalid">Select a product.</div>
          </div>

          <div class="form-group">
            <label class="form-label">Warehouse *</label>
            <select class="form-control" formControlName="warehouseId">
              <option [ngValue]="null">Select a warehouse…</option>
              <option *ngFor="let w of warehouses" [ngValue]="w.id">{{ w.name }}</option>
            </select>
            <div class="form-error" *ngIf="submitted() && form.get('warehouseId')?.invalid">Select a warehouse.</div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Movement Type *</label>
              <select class="form-control" formControlName="movementType">
                <option value="IN">Stock In</option>
                <option value="OUT">Stock Out</option>
                <option value="ADJUSTMENT">Manual Adjustment</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">
                {{ form.value.movementType === 'ADJUSTMENT' ? 'New Quantity On Hand *' : 'Quantity *' }}
              </label>
              <input class="form-control" type="number" min="1" formControlName="quantity" />
              <div class="form-error" *ngIf="submitted() && form.get('quantity')?.invalid">Enter a quantity greater than zero.</div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Reason / Notes</label>
            <input class="form-control" formControlName="reason" placeholder="e.g. Purchase order #1234" />
          </div>

          <div class="form-group">
            <label class="form-label">Reference No.</label>
            <input class="form-control" formControlName="referenceNo" placeholder="e.g. PO-1234" />
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" (click)="close.emit()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving()">
              {{ saving() ? 'Saving…' : 'Record Movement' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(17,24,39,0.5);
      display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px;
    }
    .modal-card { width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
  `]
})
export class StockMovementFormComponent {
  @Input() products: Product[] = [];
  @Input() warehouses: Warehouse[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  saving = signal(false);
  submitted = signal(false);
  errorMessage = signal('');

  form: ReturnType<FormBuilder['group']>;

  constructor(private fb: FormBuilder, private inventoryService: InventoryService) {
    this.form = this.fb.group({
      productId: this.fb.control<string | null>(null, Validators.required),
      warehouseId: this.fb.control<string | null>(null, Validators.required),
      movementType: ['IN', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      reason: [''],
      referenceNo: ['']
    });
  }

  submit(): void {
    this.submitted.set(true);
    this.errorMessage.set('');
    if (this.form.invalid) return;

    this.saving.set(true);
    const payload = this.form.value as CreateStockMovementRequest;

    this.inventoryService.recordMovement(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.friendlyMessage || 'Failed to record stock movement.');
      }
    });
  }
}
