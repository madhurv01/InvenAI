import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { WarehouseManage } from '../../../shared/models/models';
import { WarehouseService } from '../services/warehouse.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-warehouse-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LoadingSpinnerComponent],
  template: `
    <div class="page-header fade-in">
      <div>
        <h1>Warehouses</h1>
        <p style="color: var(--color-text-muted); margin:0;">Manage storage locations and view stock footprint.</p>
      </div>
      <button class="btn btn-primary" (click)="openCreate()">+ New Warehouse</button>
    </div>

    <app-loading-spinner *ngIf="loading()"></app-loading-spinner>
    <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

    <div class="card slide-up" *ngIf="!loading()">
      <div class="empty-state" *ngIf="warehouses().length === 0">No warehouses yet.</div>

      <div style="overflow-x:auto" *ngIf="warehouses().length > 0">
        <table class="data-table">
          <thead>
            <tr><th>Name</th><th>Location</th><th>Products</th><th>Total Units</th><th>Status</th><th></th></tr>
          </thead>
          <tbody class="stagger">
            <tr *ngFor="let w of warehouses(); trackBy: trackById">
              <td><strong>{{ w.name }}</strong></td>
              <td>{{ w.location || '—' }}</td>
              <td>{{ w.productCount }}</td>
              <td>{{ w.totalUnits }}</td>
              <td>
                <span class="badge" [class.badge-success]="w.isActive" [class.badge-neutral]="!w.isActive">
                  {{ w.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-secondary btn-sm" (click)="openEdit(w)">Edit</button>
                  <button class="btn btn-danger btn-sm" (click)="confirmDelete(w)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="modal-backdrop" *ngIf="showForm()" (click)="showForm.set(false)">
      <div class="modal-card card scale-in" (click)="$event.stopPropagation()">
        <h3>{{ editingWarehouse() ? 'Edit Warehouse' : 'New Warehouse' }}</h3>
        <div class="alert alert-danger" *ngIf="formError()">{{ formError() }}</div>
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="form-group">
            <label class="form-label">Name</label>
            <input class="form-control" formControlName="name" />
          </div>
          <div class="form-group">
            <label class="form-label">Location</label>
            <input class="form-control" formControlName="location" />
          </div>
          <div class="form-group">
            <label style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" formControlName="isActive" /> Active
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" (click)="showForm.set(false)">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid || saving()">
              {{ saving() ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="modal-backdrop" *ngIf="deletingWarehouse()" (click)="deletingWarehouse.set(null)">
      <div class="modal-card card scale-in" (click)="$event.stopPropagation()">
        <h3>Delete "{{ deletingWarehouse()?.name }}"?</h3>
        <p style="color:var(--color-text-muted)">Warehouses still holding stock cannot be deleted.</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" (click)="deletingWarehouse.set(null)">Cancel</button>
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
export class WarehouseListComponent implements OnInit {
  trackById = (_: number, item: WarehouseManage) => item.id;

  warehouses = signal<WarehouseManage[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  saving = signal(false);
  formError = signal('');

  showForm = signal(false);
  editingWarehouse = signal<WarehouseManage | null>(null);
  deletingWarehouse = signal<WarehouseManage | null>(null);

  form: ReturnType<FormBuilder['group']>;

  constructor(private warehouseService: WarehouseService, private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      location: [''],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.warehouseService.getAll().subscribe({
      next: (data) => { this.warehouses.set(data); this.loading.set(false); },
      error: (err) => { this.errorMessage.set(err.friendlyMessage || 'Failed to load warehouses.'); this.loading.set(false); }
    });
  }

  openCreate(): void {
    this.editingWarehouse.set(null);
    this.formError.set('');
    this.form.reset({ name: '', location: '', isActive: true });
    this.showForm.set(true);
  }

  openEdit(w: WarehouseManage): void {
    this.editingWarehouse.set(w);
    this.formError.set('');
    this.form.reset({ name: w.name, location: w.location || '', isActive: w.isActive });
    this.showForm.set(true);
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.formError.set('');
    const payload = {
      name: this.form.value.name!,
      location: this.form.value.location || null,
      isActive: this.form.value.isActive ?? true
    };
    const editing = this.editingWarehouse();
    const request = editing ? this.warehouseService.update(editing.id, payload) : this.warehouseService.create(payload);

    request.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.load(); },
      error: (err) => { this.saving.set(false); this.formError.set(err.friendlyMessage || 'Failed to save warehouse.'); }
    });
  }

  confirmDelete(w: WarehouseManage): void {
    this.deletingWarehouse.set(w);
  }

  deleteConfirmed(): void {
    const w = this.deletingWarehouse();
    if (!w) return;
    this.warehouseService.delete(w.id).subscribe({
      next: () => { this.deletingWarehouse.set(null); this.load(); },
      error: (err) => { this.errorMessage.set(err.friendlyMessage || 'Failed to delete warehouse.'); this.deletingWarehouse.set(null); }
    });
  }
}
