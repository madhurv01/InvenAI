import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Category, CreateCategoryRequest } from '../../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  constructor(private api: ApiService) {}

  getAll(): Observable<Category[]> {
    return this.api.get<Category[]>('/categories');
  }

  create(payload: CreateCategoryRequest): Observable<Category> {
    return this.api.post<Category>('/categories', payload);
  }

  update(id: string, payload: CreateCategoryRequest): Observable<Category> {
    return this.api.put<Category>(`/categories/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/categories/${id}`);
  }
}
