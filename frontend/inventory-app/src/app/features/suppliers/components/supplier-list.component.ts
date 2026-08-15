import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Supplier } from '../../../shared/models/models';
import { SupplierService } from '../services/supplier.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { SupplierFormComponent } from './supplier-form.component';

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent, SupplierFormComponent],
  template: `
    <div class="page-header fade-in">
      <div>
        <h1>Suppliers</h1>
        <p style="color: var(--color-text-muted); margin:0;">Manage supplier relationships and lead times.</p>
      </div>
      <button class="btn btn-primary" (click)="openCreate()">+ New Supplier</button>
    </div>

    <div class="toolbar card fade-in">
      <input class="form-control" style="max-width:320px" placeholder="Search by name or email…"
             [(ngModel)]="search" (ngModelChange)="onFilterChange()" />
      <span style="color: var(--color-text-muted); font-size: 13px;">{{ totalCount() }} total</span>
    </div>

    <app-loading-spinner *ngIf="loading()"></app-loading-spinner>
    <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

    <div class="card slide-up" *ngIf="!loading()">
      <div class="empty-state" *ngIf="suppliers().length === 0">No suppliers found.</div>

      <div style="overflow-x:auto" *ngIf="suppliers().length > 0">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th><th>Contact</th><th>Email</th><th>Phone</th>
              <th>Lead Time</th><th>Products</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody class="stagger">
            <tr *ngFor="let s of suppliers()">
              <td><strong>{{ s.name }}</strong></td>
              <td>{{ s.contactPerson || '—' }}</td>
              <td>{{ s.email || '—' }}</td>
              <td>{{ s.phone || '—' }}</td>
              <td>{{ s.leadTimeDays }} days</td>
              <td>{{ s.associatedProductCount }}</td>
              <td>
                <span class="badge" [class.badge-success]="s.isActive" [class.badge-neutral]="!s.isActive">
                  {{ s.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-secondary btn-sm" (click)="openEdit(s)">Edit</button>
                  <button class="btn btn-danger btn-sm" (click)="confirmDelete(s)">Delete</button>
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

    <app-supplier-form
      *ngIf="showForm()"
      [supplier]="editingSupplier()"
      (close)="showForm.set(false)"
      (saved)="onSaved()">
    </app-supplier-form>

    <div class="modal-backdrop" *ngIf="deletingSupplier()" (click)="deletingSupplier.set(null)">
      <div class="modal-card card scale-in" (click)="$event.stopPropagation()">
        <h3>Delete "{{ deletingSupplier()?.name }}"?</h3>
        <p style="color:var(--color-text-muted)">Suppliers linked to products cannot be deleted until reassigned.</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" (click)="deletingSupplier.set(null)">Cancel</button>
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
export class SupplierListComponent implements OnInit {
  suppliers = signal<Supplier[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  search = '';

  page = signal(1);
  pageSize = 10;
  totalCount = signal(0);
  totalPages = signal(1);

  showForm = signal(false);
  editingSupplier = signal<Supplier | null>(null);
  deletingSupplier = signal<Supplier | null>(null);

  private filterTimeout: any;

  constructor(private supplierService: SupplierService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.supplierService.getAll(this.search || undefined, this.page(), this.pageSize).subscribe({
      next: (result) => {
        this.suppliers.set(result.items);
        this.totalCount.set(result.totalCount);
        this.totalPages.set(result.totalPages || 1);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.friendlyMessage || 'Failed to load suppliers.');
        this.loading.set(false);
      }
    });
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
    this.editingSupplier.set(null);
    this.showForm.set(true);
  }

  openEdit(s: Supplier): void {
    this.editingSupplier.set(s);
    this.showForm.set(true);
  }

  onSaved(): void {
    this.showForm.set(false);
    this.load();
  }

  confirmDelete(s: Supplier): void {
    this.deletingSupplier.set(s);
  }

  deleteConfirmed(): void {
    const s = this.deletingSupplier();
    if (!s) return;
    this.supplierService.delete(s.id).subscribe({
      next: () => {
        this.deletingSupplier.set(null);
        this.load();
      },
      error: (err) => {
        this.errorMessage.set(err.friendlyMessage || 'Failed to delete supplier.');
        this.deletingSupplier.set(null);
      }
    });
  }
}
