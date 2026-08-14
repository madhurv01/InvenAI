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
    <div class="page-header">
      <div>
        <h1>Suppliers</h1>
        <p style="color: var(--color-text-muted); margin:0;">Manage supplier relationships and lead times.</p>
      </div>
      <button class="btn btn-primary" (click)="openCreate()">+ New Supplier</button>
    </div>

    <div class="toolbar card">
      <input class="form-control" style="max-width:320px" placeholder="Search by name or email…"
             [(ngModel)]="search" (ngModelChange)="onFilterChange()" />
    </div>

    <app-loading-spinner *ngIf="loading()"></app-loading-spinner>
    <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

    <div class="card" *ngIf="!loading()">
      <div class="empty-state" *ngIf="suppliers().length === 0">No suppliers found.</div>

      <table class="data-table" *ngIf="suppliers().length > 0">
        <thead>
          <tr>
            <th>Name</th><th>Contact</th><th>Email</th><th>Phone</th>
            <th>Lead Time</th><th>Products</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let s of suppliers()">
            <td>{{ s.name }}</td>
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

    <app-supplier-form
      *ngIf="showForm()"
      [supplier]="editingSupplier()"
      (close)="showForm.set(false)"
      (saved)="onSaved()">
    </app-supplier-form>

    <div class="modal-backdrop" *ngIf="deletingSupplier()" (click)="deletingSupplier.set(null)">
      <div class="modal-card card" (click)="$event.stopPropagation()">
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
    this.supplierService.getAll(this.search || undefined).subscribe({
      next: (data) => {
        this.suppliers.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.friendlyMessage || 'Failed to load suppliers.');
        this.loading.set(false);
      }
    });
  }

  onFilterChange(): void {
    clearTimeout(this.filterTimeout);
    this.filterTimeout = setTimeout(() => this.load(), 300);
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
