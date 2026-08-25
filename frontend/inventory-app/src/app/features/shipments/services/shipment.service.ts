import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { CreateShipmentRequest, ShipmentDetail, ShipmentSummary } from '../../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class ShipmentService {
  constructor(private api: ApiService) {}

  create(dto: CreateShipmentRequest): Observable<ShipmentDetail> {
    return this.api.post<ShipmentDetail>('/shipments', dto);
  }

  getAll(): Observable<ShipmentSummary[]> {
    return this.api.get<ShipmentSummary[]>('/shipments');
  }

  getById(id: string): Observable<ShipmentDetail> {
    return this.api.get<ShipmentDetail>(`/shipments/${id}`);
  }

  updateStatus(id: string, status: 'Delivered' | 'Cancelled'): Observable<ShipmentDetail> {
    return this.api.patch<ShipmentDetail>(`/shipments/${id}/status`, { status });
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/shipments/${id}`);
  }
}
