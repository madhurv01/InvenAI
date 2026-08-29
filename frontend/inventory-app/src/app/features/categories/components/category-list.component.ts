import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Category } from '../../../shared/models/models';
import { CategoryService } from '../services/category.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LoadingSpinnerComponent],
  template: `
    <div class="page-header fade-in">
      <div>
        <h1>Categories</h1>
        <p style="color: var(--color-text-muted); margin:0;">Organize products into categories.</p>
      </div>
      <button class="btn btn-primary" (click)="openCreate()">+ New Category</button>
    </div>

    <app-loading-spinner *ngIf="loading()"></app-loading-spinner>
    <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

    <div class="card slide-up" *ngIf="!loading()">
      <div class="empty-state" *ngIf="categories().length === 0">No categories yet.</div>

      <div style="overflow-x:auto" *ngIf="categories().length > 0">
        <table class="data-table">
          <thead>
            <tr><th>Name</th><th>Description</th><th>Products</th><th></th></tr>
          </thead>
          <tbody class="stagger">
            <tr *ngFor="let c of categories(); trackBy: trackById">
              <td><strong>{{ c.name }}</strong></td>
              <td>{{ c.description || '—' }}</td>
              <td><span class="badge badge-neutral">{{ c.productCount }}</span></td>
              <td>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-secondary btn-sm" (click)="openEdit(c)">Edit</button>
                  <button class="btn btn-danger btn-sm" (click)="confirmDelete(c)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="modal-backdrop" *ngIf="showForm()" (click)="showForm.set(false)">
      <div class="modal-card card scale-in" (click)="$event.stopPropagation()">
        <h3>{{ editingCategory() ? 'Edit Category' : 'New Category' }}</h3>
        <div class="alert alert-danger" *ngIf="formError()">{{ formError() }}</div>
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="form-group">
            <label class="form-label">Name</label>
            <input class="form-control" formControlName="name" />
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-control" rows="3" formControlName="description"></textarea>
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

    <div class="modal-backdrop" *ngIf="deletingCategory()" (click)="deletingCategory.set(null)">
      <div class="modal-card card scale-in" (click)="$event.stopPropagation()">
        <h3>Delete "{{ deletingCategory()?.name }}"?</h3>
        <p style="color:var(--color-text-muted)">Categories still assigned to products cannot be deleted.</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" (click)="deletingCategory.set(null)">Cancel</button>
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
export class CategoryListComponent implements OnInit {
  trackById = (_: number, item: Category) => item.id;

  categories = signal<Category[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  saving = signal(false);
  formError = signal('');

  showForm = signal(false);
  editingCategory = signal<Category | null>(null);
  deletingCategory = signal<Category | null>(null);

  form: ReturnType<FormBuilder['group']>;

  constructor(private categoryService: CategoryService, private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.categoryService.getAll().subscribe({
      next: (data) => { this.categories.set(data); this.loading.set(false); },
      error: (err) => { this.errorMessage.set(err.friendlyMessage || 'Failed to load categories.'); this.loading.set(false); }
    });
  }

  openCreate(): void {
    this.editingCategory.set(null);
    this.formError.set('');
    this.form.reset({ name: '', description: '' });
    this.showForm.set(true);
  }

  openEdit(c: Category): void {
    this.editingCategory.set(c);
    this.formError.set('');
    this.form.reset({ name: c.name, description: c.description || '' });
    this.showForm.set(true);
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.formError.set('');
    const payload = { name: this.form.value.name!, description: this.form.value.description || null };
    const editing = this.editingCategory();
    const request = editing ? this.categoryService.update(editing.id, payload) : this.categoryService.create(payload);

    request.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.load(); },
      error: (err) => { this.saving.set(false); this.formError.set(err.friendlyMessage || 'Failed to save category.'); }
    });
  }

  confirmDelete(c: Category): void {
    this.deletingCategory.set(c);
  }

  deleteConfirmed(): void {
    const c = this.deletingCategory();
    if (!c) return;
    this.categoryService.delete(c.id).subscribe({
      next: () => { this.deletingCategory.set(null); this.load(); },
      error: (err) => { this.errorMessage.set(err.friendlyMessage || 'Failed to delete category.'); this.deletingCategory.set(null); }
    });
  }
}
