import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Category, CreateProductRequest, PagedResult, Product } from '../../../shared/models/models';

export interface ProductQuery {
  search?: string;
  categoryId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDesc?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private api: ApiService) {}

  getAll(filters?: ProductQuery): Observable<PagedResult<Product>> {
    return this.api.get<PagedResult<Product>>('/products', filters);
  }

  getById(id: string): Observable<Product> {
    return this.api.get<Product>(`/products/${id}`);
  }

  create(payload: CreateProductRequest): Observable<Product> {
    return this.api.post<Product>('/products', payload);
  }

  update(id: string, payload: CreateProductRequest): Observable<Product> {
    return this.api.put<Product>(`/products/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/products/${id}`);
  }

  getCategories(): Observable<Category[]> {
    return this.api.get<Category[]>('/categories');
  }
}
