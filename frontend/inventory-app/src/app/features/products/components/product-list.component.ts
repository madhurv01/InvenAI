import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Category, Product, Supplier } from '../../../shared/models/models';
import { ProductService } from '../services/product.service';
import { SupplierService } from '../../suppliers/services/supplier.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ProductFormComponent } from './product-form.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent, ProductFormComponent],
  template: `
    <div class="page-header">
      <div>
        <h1>Products</h1>
        <p style="color: var(--color-text-muted); margin:0;">Manage your product catalog.</p>
      </div>
      <button class="btn btn-primary" (click)="openCreate()">+ New Product</button>
    </div>

    <div class="toolbar card">
      <input class="form-control" style="max-width:280px" placeholder="Search by name or SKU…"
             [(ngModel)]="search" (ngModelChange)="onFilterChange()" />
      <select class="form-control" style="max-width:200px" [(ngModel)]="categoryFilter" (ngModelChange)="onFilterChange()">
        <option [ngValue]="''">All Categories</option>
        <option *ngFor="let c of categories()" [ngValue]="c.id">{{ c.name }}</option>
      </select>
      <select class="form-control" style="max-width:180px" [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()">
        <option value="">All Statuses</option>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
        <option value="Discontinued">Discontinued</option>
      </select>
    </div>

    <app-loading-spinner *ngIf="loading()"></app-loading-spinner>
    <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

    <div class="card" *ngIf="!loading()">
      <div class="empty-state" *ngIf="products().length === 0">No products found. Try adjusting your filters.</div>

      <table class="data-table" *ngIf="products().length > 0">
        <thead>
          <tr>
            <th>Name</th><th>SKU</th><th>Category</th><th>Supplier</th>
            <th>Unit Price</th><th>Stock</th><th>Min. Level</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of products()">
            <td>{{ p.name }}</td>
            <td>{{ p.sku }}</td>
            <td>{{ p.categoryName || '—' }}</td>
            <td>{{ p.supplierName || '—' }}</td>
            <td>{{ p.unitPrice | currency:'INR':'symbol':'1.0-2' }}</td>
            <td>
              <span class="badge" [class.badge-danger]="p.totalStock <= p.minimumStockLevel" [class.badge-success]="p.totalStock > p.minimumStockLevel">
                {{ p.totalStock }}
              </span>
            </td>
            <td>{{ p.minimumStockLevel }}</td>
            <td>
              <span class="badge"
                    [class.badge-success]="p.status === 'Active'"
                    [class.badge-neutral]="p.status === 'Inactive'"
                    [class.badge-danger]="p.status === 'Discontinued'">
                {{ p.status }}
              </span>
            </td>
            <td>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-secondary btn-sm" (click)="openEdit(p)">Edit</button>
                <button class="btn btn-danger btn-sm" (click)="confirmDelete(p)">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <app-product-form
      *ngIf="showForm()"
      [product]="editingProduct()"
      [categories]="categories()"
      [suppliers]="suppliers()"
      (close)="showForm.set(false)"
      (saved)="onSaved()">
    </app-product-form>

    <div class="modal-backdrop" *ngIf="deletingProduct()" (click)="deletingProduct.set(null)">
      <div class="modal-card card" (click)="$event.stopPropagation()">
        <h3>Delete "{{ deletingProduct()?.name }}"?</h3>
        <p style="color:var(--color-text-muted)">This action cannot be undone.</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" (click)="deletingProduct.set(null)">Cancel</button>
          <button class="btn btn-danger" (click)="deleteConfirmed()">Delete</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(17,24,39,0.5);
      display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px;
    }
    .modal-card { width: 100%; max-width: 420px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
  `]
})
export class ProductListComponent implements OnInit {
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  suppliers = signal<Supplier[]>([]);
  loading = signal(true);
  errorMessage = signal('');

  search = '';
  categoryFilter = '';
  statusFilter = '';

  showForm = signal(false);
  editingProduct = signal<Product | null>(null);
  deletingProduct = signal<Product | null>(null);

  private filterTimeout: any;

  constructor(private productService: ProductService, private supplierService: SupplierService) {}

  ngOnInit(): void {
    this.productService.getCategories().subscribe(c => this.categories.set(c));
    this.supplierService.getAll().subscribe(s => this.suppliers.set(s));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.productService.getAll({
      search: this.search || undefined,
      categoryId: this.categoryFilter || undefined,
      status: this.statusFilter || undefined
    }).subscribe({
      next: (data) => {
        this.products.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.friendlyMessage || 'Failed to load products.');
        this.loading.set(false);
      }
    });
  }

  onFilterChange(): void {
    clearTimeout(this.filterTimeout);
    this.filterTimeout = setTimeout(() => this.load(), 300);
  }

  openCreate(): void {
    this.editingProduct.set(null);
    this.showForm.set(true);
  }

  openEdit(p: Product): void {
    this.editingProduct.set(p);
    this.showForm.set(true);
  }

  onSaved(): void {
    this.showForm.set(false);
    this.load();
  }

  confirmDelete(p: Product): void {
    this.deletingProduct.set(p);
  }

  deleteConfirmed(): void {
    const p = this.deletingProduct();
    if (!p) return;
    this.productService.delete(p.id).subscribe({
      next: () => {
        this.deletingProduct.set(null);
        this.load();
      },
      error: (err) => {
        this.errorMessage.set(err.friendlyMessage || 'Failed to delete product.');
        this.deletingProduct.set(null);
      }
    });
  }
}
