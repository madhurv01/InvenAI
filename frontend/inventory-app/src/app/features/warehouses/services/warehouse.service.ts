import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { CreateWarehouseRequest, WarehouseManage } from '../../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class WarehouseService {
  constructor(private api: ApiService) {}

  getAll(): Observable<WarehouseManage[]> {
    return this.api.get<WarehouseManage[]>('/warehouses');
  }

  create(payload: CreateWarehouseRequest): Observable<WarehouseManage> {
    return this.api.post<WarehouseManage>('/warehouses', payload);
  }

  update(id: string, payload: CreateWarehouseRequest): Observable<WarehouseManage> {
    return this.api.put<WarehouseManage>(`/warehouses/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/warehouses/${id}`);
  }
}
