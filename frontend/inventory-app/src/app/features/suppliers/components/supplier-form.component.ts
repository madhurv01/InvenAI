import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateSupplierRequest, Supplier } from '../../../shared/models/models';
import { SupplierService } from '../services/supplier.service';

@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-card card" (click)="$event.stopPropagation()">
        <h2>{{ supplier ? 'Edit Supplier' : 'New Supplier' }}</h2>

        <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="form-group">
            <label class="form-label">Supplier Name *</label>
            <input class="form-control" formControlName="name" placeholder="e.g. Acme Supplies Pvt Ltd" />
            <div class="form-error" *ngIf="submitted() && form.get('name')?.invalid">Supplier name is required.</div>
          </div>

          <div class="form-group">
            <label class="form-label">Contact Person</label>
            <input class="form-control" formControlName="contactPerson" placeholder="e.g. Rahul Sharma" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Email</label>
              <input class="form-control" formControlName="email" placeholder="contact@supplier.com" />
              <div class="form-error" *ngIf="submitted() && form.get('email')?.invalid">Enter a valid email address.</div>
            </div>
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input class="form-control" formControlName="phone" placeholder="+91-9876543210" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Address</label>
            <input class="form-control" formControlName="address" placeholder="Street, City, State" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Lead Time (days) *</label>
              <input class="form-control" type="number" min="0" formControlName="leadTimeDays" />
              <div class="form-error" *ngIf="submitted() && form.get('leadTimeDays')?.invalid">Enter a valid number of days.</div>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select class="form-control" formControlName="isActive">
                <option [ngValue]="true">Active</option>
                <option [ngValue]="false">Inactive</option>
              </select>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" (click)="close.emit()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving()">
              {{ saving() ? 'Saving…' : (supplier ? 'Save Changes' : 'Create Supplier') }}
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
    .modal-card { width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
  `]
})
export class SupplierFormComponent implements OnChanges {
  @Input() supplier: Supplier | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  saving = signal(false);
  submitted = signal(false);
  errorMessage = signal('');

  form: ReturnType<FormBuilder['group']>;

  constructor(private fb: FormBuilder, private supplierService: SupplierService) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      contactPerson: [''],
      email: ['', Validators.email],
      phone: [''],
      address: [''],
      leadTimeDays: [7, [Validators.required, Validators.min(0)]],
      isActive: [true]
    });
  }

  ngOnChanges(): void {
    if (this.supplier) {
      this.form.patchValue({
        name: this.supplier.name,
        contactPerson: this.supplier.contactPerson ?? '',
        email: this.supplier.email ?? '',
        phone: this.supplier.phone ?? '',
        address: this.supplier.address ?? '',
        leadTimeDays: this.supplier.leadTimeDays,
        isActive: this.supplier.isActive
      });
    }
  }

  submit(): void {
    this.submitted.set(true);
    this.errorMessage.set('');
    if (this.form.invalid) return;

    this.saving.set(true);
    const payload = this.form.value as CreateSupplierRequest;

    const request$ = this.supplier
      ? this.supplierService.update(this.supplier.id, payload)
      : this.supplierService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.friendlyMessage || 'Failed to save supplier.');
      }
    });
  }
}
