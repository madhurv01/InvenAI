import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  CreateAlertWorkflowRequest,
  CreateSupplyChainWorkflowRequest,
  CreateTriggerWorkflowRequest,
  WorkflowDetail,
  WorkflowSummary
} from '../../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  constructor(private api: ApiService) {}

  createAlert(dto: CreateAlertWorkflowRequest): Observable<WorkflowDetail> {
    return this.api.post<WorkflowDetail>('/workflows/alert', dto);
  }

  createTrigger(dto: CreateTriggerWorkflowRequest): Observable<WorkflowDetail> {
    return this.api.post<WorkflowDetail>('/workflows/trigger', dto);
  }

  createSupplyChain(dto: CreateSupplyChainWorkflowRequest): Observable<WorkflowDetail> {
    return this.api.post<WorkflowDetail>('/workflows/supplychain', dto);
  }

  getAll(): Observable<WorkflowSummary[]> {
    return this.api.get<WorkflowSummary[]>('/workflows');
  }

  getById(id: string): Observable<WorkflowDetail> {
    return this.api.get<WorkflowDetail>(`/workflows/${id}`);
  }

  pause(id: string): Observable<WorkflowDetail> {
    return this.api.patch<WorkflowDetail>(`/workflows/${id}/pause`, {});
  }

  resume(id: string): Observable<WorkflowDetail> {
    return this.api.patch<WorkflowDetail>(`/workflows/${id}/resume`, {});
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/workflows/${id}`);
  }
}
