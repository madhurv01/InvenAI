import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { DashboardAnalytics, DashboardSummary } from '../../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private api: ApiService) {}

  getSummary(): Observable<DashboardSummary> {
    return this.api.get<DashboardSummary>('/dashboard/summary');
  }

  getAnalytics(): Observable<DashboardAnalytics> {
    return this.api.get<DashboardAnalytics>('/dashboard/analytics');
  }
}
