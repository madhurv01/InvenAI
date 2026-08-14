import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category, CreateProductRequest, Product, Supplier } from '../../../shared/models/models';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-card card" (click)="$event.stopPropagation()">
        <h2>{{ product ? 'Edit Product' : 'New Product' }}</h2>

        <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Product Name *</label>
              <input class="form-control" formControlName="name" placeholder="e.g. Wireless Mouse" />
              <div class="form-error" *ngIf="submitted() && form.get('name')?.invalid">Product name is required.</div>
            </div>
            <div class="form-group">
              <label class="form-label">SKU *</label>
              <input class="form-control" formControlName="sku" placeholder="e.g. SKU-EL-1001" />
              <div class="form-error" *ngIf="submitted() && form.get('sku')?.invalid">SKU is required.</div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select class="form-control" formControlName="categoryId">
                <option [ngValue]="null">— None —</option>
                <option *ngFor="let c of categories" [ngValue]="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Supplier</label>
              <select class="form-control" formControlName="supplierId">
                <option [ngValue]="null">— None —</option>
                <option *ngFor="let s of suppliers" [ngValue]="s.id">{{ s.name }}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Unit Price (₹) *</label>
              <input class="form-control" type="number" min="0" step="0.01" formControlName="unitPrice" />
              <div class="form-error" *ngIf="submitted() && form.get('unitPrice')?.invalid">Enter a valid price (0 or more).</div>
            </div>
            <div class="form-group">
              <label class="form-label">Minimum Stock Level *</label>
              <input class="form-control" type="number" min="0" formControlName="minimumStockLevel" />
              <div class="form-error" *ngIf="submitted() && form.get('minimumStockLevel')?.invalid">Enter a valid quantity (0 or more).</div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-control" formControlName="status">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Discontinued">Discontinued</option>
            </select>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" (click)="close.emit()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving()">
              {{ saving() ? 'Saving…' : (product ? 'Save Changes' : 'Create Product') }}
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
    .modal-card { width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
  `]
})
export class ProductFormComponent implements OnChanges {
  @Input() product: Product | null = null;
  @Input() categories: Category[] = [];
  @Input() suppliers: Supplier[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  saving = signal(false);
  submitted = signal(false);
  errorMessage = signal('');

  form: ReturnType<FormBuilder['group']>;

  constructor(private fb: FormBuilder, private productService: ProductService) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      sku: ['', Validators.required],
      categoryId: this.fb.control<string | null>(null),
      supplierId: this.fb.control<string | null>(null),
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      minimumStockLevel: [0, [Validators.required, Validators.min(0)]],
      status: ['Active', Validators.required]
    });
  }

  ngOnChanges(): void {
    if (this.product) {
      this.form.patchValue({
        name: this.product.name,
        sku: this.product.sku,
        categoryId: this.product.categoryId ?? null,
        supplierId: this.product.supplierId ?? null,
        unitPrice: this.product.unitPrice,
        minimumStockLevel: this.product.minimumStockLevel,
        status: this.product.status
      });
    }
  }

  submit(): void {
    this.submitted.set(true);
    this.errorMessage.set('');
    if (this.form.invalid) return;

    this.saving.set(true);
    const payload = this.form.value as CreateProductRequest;

    const request$ = this.product
      ? this.productService.update(this.product.id, payload)
      : this.productService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.friendlyMessage || 'Failed to save product.');
      }
    });
  }
}
