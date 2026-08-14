import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Category, CreateProductRequest, Product } from '../../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private api: ApiService) {}

  getAll(filters?: { search?: string; categoryId?: string; status?: string }): Observable<Product[]> {
    return this.api.get<Product[]>('/products', filters);
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
