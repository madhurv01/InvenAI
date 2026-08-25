import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  CreatePackageOrderRequest,
  PackageOrderDetail,
  PackageOrderPending,
  PackageOrderSummary
} from '../../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class PackageOrderService {
  constructor(private api: ApiService) {}

  create(dto: CreatePackageOrderRequest): Observable<PackageOrderDetail> {
    return this.api.post<PackageOrderDetail>('/packageorders', dto);
  }

  getAll(): Observable<PackageOrderSummary[]> {
    return this.api.get<PackageOrderSummary[]>('/packageorders');
  }

  getPending(): Observable<PackageOrderPending[]> {
    return this.api.get<PackageOrderPending[]>('/packageorders/pending');
  }

  getById(id: string): Observable<PackageOrderDetail> {
    return this.api.get<PackageOrderDetail>(`/packageorders/${id}`);
  }

  cancel(id: string): Observable<PackageOrderDetail> {
    return this.api.patch<PackageOrderDetail>(`/packageorders/${id}/cancel`, {});
  }
}
