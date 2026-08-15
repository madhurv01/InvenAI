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
    <div class="page-header fade-in">
      <div>
        <h1>Products</h1>
        <p style="color: var(--color-text-muted); margin:0;">Manage your product catalog.</p>
      </div>
      <button class="btn btn-primary" (click)="openCreate()">+ New Product</button>
    </div>

    <div class="toolbar card fade-in">
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
      <span style="color: var(--color-text-muted); font-size: 13px; margin-left: auto;">{{ totalCount() }} total</span>
    </div>

    <app-loading-spinner *ngIf="loading()"></app-loading-spinner>
    <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

    <div class="card slide-up" *ngIf="!loading()">
      <div class="empty-state" *ngIf="products().length === 0">No products found. Try adjusting your filters.</div>

      <div style="overflow-x:auto" *ngIf="products().length > 0">
        <table class="data-table">
          <thead>
            <tr>
              <th class="sortable" (click)="sort('name')">Name {{ sortIndicator('name') }}</th>
              <th class="sortable" (click)="sort('sku')">SKU {{ sortIndicator('sku') }}</th>
              <th class="sortable" (click)="sort('category')">Category {{ sortIndicator('category') }}</th>
              <th>Supplier</th>
              <th class="sortable" (click)="sort('unitprice')">Unit Price {{ sortIndicator('unitprice') }}</th>
              <th>Stock</th><th>Min. Level</th>
              <th class="sortable" (click)="sort('status')">Status {{ sortIndicator('status') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody class="stagger">
            <tr *ngFor="let p of products()">
              <td><strong>{{ p.name }}</strong></td>
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

      <div class="grid-pagination" *ngIf="totalPages() > 1">
        <span>Page {{ page() }} of {{ totalPages() }}</span>
        <div class="pages">
          <button class="page-btn" [disabled]="page() === 1" (click)="goToPage(page() - 1)">‹</button>
          <button *ngFor="let p of pageNumbers()" class="page-btn" [class.active]="p === page()" (click)="goToPage(p)">{{ p }}</button>
          <button class="page-btn" [disabled]="page() === totalPages()" (click)="goToPage(page() + 1)">›</button>
        </div>
      </div>
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
      <div class="modal-card card scale-in" (click)="$event.stopPropagation()">
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

  page = signal(1);
  pageSize = 10;
  totalCount = signal(0);
  totalPages = signal(1);
  sortBy = signal<string | null>(null);
  sortDesc = signal(false);

  showForm = signal(false);
  editingProduct = signal<Product | null>(null);
  deletingProduct = signal<Product | null>(null);

  private filterTimeout: any;

  constructor(private productService: ProductService, private supplierService: SupplierService) {}

  ngOnInit(): void {
    this.productService.getCategories().subscribe(c => this.categories.set(c));
    this.supplierService.getAll(undefined, 1, 200).subscribe(r => this.suppliers.set(r.items));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.productService.getAll({
      search: this.search || undefined,
      categoryId: this.categoryFilter || undefined,
      status: this.statusFilter || undefined,
      page: this.page(),
      pageSize: this.pageSize,
      sortBy: this.sortBy() || undefined,
      sortDesc: this.sortDesc()
    }).subscribe({
      next: (result) => {
        this.products.set(result.items);
        this.totalCount.set(result.totalCount);
        this.totalPages.set(result.totalPages || 1);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.friendlyMessage || 'Failed to load products.');
        this.loading.set(false);
      }
    });
  }

  sort(field: string): void {
    if (this.sortBy() === field) {
      this.sortDesc.set(!this.sortDesc());
    } else {
      this.sortBy.set(field);
      this.sortDesc.set(false);
    }
    this.load();
  }

  sortIndicator(field: string): string {
    if (this.sortBy() !== field) return '';
    return this.sortDesc() ? '↓' : '↑';
  }

  pageNumbers(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.load();
  }

  onFilterChange(): void {
    clearTimeout(this.filterTimeout);
    this.filterTimeout = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 300);
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
