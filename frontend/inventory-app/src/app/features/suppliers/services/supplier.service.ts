import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { CreateSupplierRequest, Supplier } from '../../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class SupplierService {
  constructor(private api: ApiService) {}

  getAll(search?: string): Observable<Supplier[]> {
    return this.api.get<Supplier[]>('/suppliers', { search });
  }

  getById(id: string): Observable<Supplier> {
    return this.api.get<Supplier>(`/suppliers/${id}`);
  }

  create(payload: CreateSupplierRequest): Observable<Supplier> {
    return this.api.post<Supplier>('/suppliers', payload);
  }

  update(id: string, payload: CreateSupplierRequest): Observable<Supplier> {
    return this.api.put<Supplier>(`/suppliers/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/suppliers/${id}`);
  }
}
