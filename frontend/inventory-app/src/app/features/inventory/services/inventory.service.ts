import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { CreateStockMovementRequest, InventoryItem, StockMovement, Warehouse } from '../../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  constructor(private api: ApiService) {}

  getStock(filters?: { productId?: string; warehouseId?: string; lowStockOnly?: boolean }): Observable<InventoryItem[]> {
    return this.api.get<InventoryItem[]>('/inventory/stock', filters);
  }

  getWarehouses(): Observable<Warehouse[]> {
    return this.api.get<Warehouse[]>('/inventory/warehouses');
  }

  recordMovement(payload: CreateStockMovementRequest): Observable<StockMovement> {
    return this.api.post<StockMovement>('/inventory/movements', payload);
  }

  getMovementHistory(filters?: { productId?: string; warehouseId?: string; take?: number }): Observable<StockMovement[]> {
    return this.api.get<StockMovement[]>('/inventory/movements', filters);
  }
}
