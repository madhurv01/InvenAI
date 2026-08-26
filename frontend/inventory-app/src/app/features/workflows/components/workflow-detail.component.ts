import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkflowService } from '../services/workflow.service';
import { WorkflowDetail } from '../../../shared/models/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-workflow-detail',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent],
  template: `
    <div class="page-header fade-in">
      <div>
        <h1>{{ typeIcon() }} {{ workflow()?.name || 'Workflow' }}</h1>
        <p style="color: var(--color-text-muted); margin: 0;">{{ typeLabel() }} workflow</p>
      </div>
      <button class="btn btn-secondary" (click)="router.navigate(['/workflows'])">← Back to Workflows</button>
    </div>

    <app-loading-spinner *ngIf="loading()"></app-loading-spinner>
    <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

    <ng-container *ngIf="!loading() && workflow() as w">
      <div class="detail-layout slide-up">
        <div class="card timeline-card">
          <div class="status-row">
            <span class="badge badge-lg"
                  [class.badge-success]="w.status === 'Active'"
                  [class.badge-neutral]="w.status === 'Paused'"
                  [class.badge-info]="w.status === 'Completed'"
                  [class.badge-danger]="w.status === 'Failed'">
              {{ w.status }}
            </span>
            <span class="last-run" *ngIf="w.lastRunAt">Last checked {{ w.lastRunAt | date:'MMM d, h:mm:ss a' }}</span>
          </div>

          <h3>Activity</h3>
          <div class="empty-state" *ngIf="w.events.length === 0">No activity yet — this workflow hasn't run yet.</div>
          <div class="timeline">
            <div class="timeline-item" *ngFor="let e of w.events">
              <div class="timeline-dot" [class.dot-error]="e.eventType === 'Error' || e.eventType === 'EmailFailed'"
                   [class.dot-success]="e.eventType === 'AlertSent' || e.eventType === 'ReportSent' || e.eventType === 'ShipmentCreated'"></div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <span class="event-type">{{ e.eventType }}</span>
                  <span class="event-time">{{ e.createdAt | date:'MMM d, h:mm a' }}</span>
                </div>
                <div class="event-message">{{ e.message }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="side-panel">
          <div class="card">
            <h3>Configuration</h3>
            <dl>
              <ng-container [ngSwitch]="w.type">
                <ng-container *ngSwitchCase="'Alert'">
                  <dt>Warehouse</dt><dd>{{ w.config['warehouseName'] }}</dd>
                  <dt>Product</dt><dd>{{ w.config['productName'] || 'Any product' }}</dd>
                  <dt>Threshold</dt><dd>&lt; {{ w.config['thresholdQuantity'] }} units</dd>
                  <dt>Recipient</dt><dd>{{ w.config['recipientEmail'] }}</dd>
                </ng-container>
                <ng-container *ngSwitchCase="'Trigger'">
                  <dt>Package Order</dt><dd>{{ w.config['packageOrderNumber'] }}</dd>
                  <dt>Scheduled</dt><dd>{{ w.config['scheduledAt'] | date:'MMM d, y, h:mm a' }}</dd>
                  <dt>Route</dt><dd>{{ w.config['originName'] }} → {{ w.config['destinationName'] }}</dd>
                  <dt>Recipient</dt><dd>{{ w.config['recipientEmail'] }}</dd>
                  <ng-container *ngIf="w.config['shipmentOrderNumber']">
                    <dt>Shipment</dt><dd>{{ w.config['shipmentOrderNumber'] }}</dd>
                  </ng-container>
                </ng-container>
                <ng-container *ngSwitchCase="'SupplyChain'">
                  <dt>Product</dt><dd>{{ w.config['productName'] }}</dd>
                  <dt>Warehouse</dt><dd>{{ w.config['warehouseName'] }}</dd>
                  <dt>Threshold</dt><dd>&lt; {{ w.config['thresholdQuantity'] }} units</dd>
                  <dt>Recipient</dt><dd>{{ w.config['recipientEmail'] }}</dd>
                </ng-container>
              </ng-container>
              <dt>Created</dt><dd>{{ w.createdAt | date:'MMM d, y, h:mm a' }}</dd>
            </dl>
          </div>

          <div class="card" *ngIf="w.type === 'Trigger' && w.config['shipmentId']">
            <button class="btn btn-primary btn-sm" style="width:100%" (click)="router.navigate(['/shipments', w.config['shipmentId']])">Track Shipment</button>
          </div>

          <div class="card" *ngIf="w.status === 'Active' || w.status === 'Paused'">
            <h3>Actions</h3>
            <button *ngIf="w.status === 'Active'" class="btn btn-secondary action-btn" [disabled]="acting()" (click)="pause()">⏸ Pause</button>
            <button *ngIf="w.status === 'Paused'" class="btn btn-primary action-btn" [disabled]="acting()" (click)="resume()">▶ Resume</button>
            <button class="btn btn-danger action-btn" [disabled]="acting()" (click)="remove()">🗑 Delete</button>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .detail-layout { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
    @media (max-width: 900px) { .detail-layout { grid-template-columns: 1fr; } }

    .timeline-card { padding: 20px; }
    .status-row { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .badge-lg { font-size: 13px; padding: 6px 14px; }
    .badge-info { background: #e0e7ff; color: #4338ca; }
    .last-run { font-size: 12px; color: var(--color-text-muted); }

    .timeline { display: flex; flex-direction: column; gap: 0; margin-top: 4px; }
    .timeline-item { display: flex; gap: 14px; padding-bottom: 18px; position: relative; }
    .timeline-item:not(:last-child)::before {
      content: ''; position: absolute; left: 5px; top: 16px; bottom: 0; width: 2px; background: var(--color-border);
    }
    .timeline-dot {
      width: 12px; height: 12px; border-radius: 50%; background: var(--color-text-muted);
      flex-shrink: 0; margin-top: 3px; z-index: 1;
    }
    .dot-success { background: #10b981; }
    .dot-error { background: #ef4444; }
    .timeline-content { flex: 1; }
    .timeline-header { display: flex; justify-content: space-between; gap: 10px; }
    .event-type { font-size: 12px; font-weight: 700; color: var(--color-text); }
    .event-time { font-size: 11px; color: var(--color-text-muted); white-space: nowrap; }
    .event-message { font-size: 12.5px; color: var(--color-text-muted); margin-top: 3px; line-height: 1.5; }

    .side-panel { display: flex; flex-direction: column; gap: 16px; }
    .side-panel h3 { margin-bottom: 12px; font-size: 14px; }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 8px 12px; margin: 0; }
    dt { font-size: 11.5px; color: var(--color-text-muted); font-weight: 600; white-space: nowrap; }
    dd { margin: 0; font-size: 12.5px; text-align: right; overflow: hidden; text-overflow: ellipsis; }

    .action-btn { width: 100%; margin-bottom: 8px; }
    .action-btn:last-child { margin-bottom: 0; }
  `]
})
export class WorkflowDetailComponent implements OnInit {
  workflow = signal<WorkflowDetail | null>(null);
  loading = signal(true);
  errorMessage = signal('');
  acting = signal(false);

  private id!: string;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private workflowService: WorkflowService
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.workflowService.getById(this.id).subscribe({
      next: (w) => { this.workflow.set(w); this.loading.set(false); },
      error: (err) => {
        this.errorMessage.set(err.friendlyMessage || 'Failed to load workflow.');
        this.loading.set(false);
      }
    });
  }

  typeIcon(): string {
    const t = this.workflow()?.type;
    return t === 'Alert' ? '⚠️' : t === 'Trigger' ? '🚢' : '🔗';
  }

  typeLabel(): string {
    const t = this.workflow()?.type;
    return t === 'SupplyChain' ? 'Supply Chain' : (t || '');
  }

  pause(): void {
    this.acting.set(true);
    this.workflowService.pause(this.id).subscribe({
      next: (w) => { this.workflow.set(w); this.acting.set(false); },
      error: (err) => { this.errorMessage.set(err.friendlyMessage || 'Failed to pause.'); this.acting.set(false); }
    });
  }

  resume(): void {
    this.acting.set(true);
    this.workflowService.resume(this.id).subscribe({
      next: (w) => { this.workflow.set(w); this.acting.set(false); },
      error: (err) => { this.errorMessage.set(err.friendlyMessage || 'Failed to resume.'); this.acting.set(false); }
    });
  }

  remove(): void {
    this.acting.set(true);
    this.workflowService.delete(this.id).subscribe({
      next: () => this.router.navigate(['/workflows']),
      error: (err) => { this.errorMessage.set(err.friendlyMessage || 'Failed to delete.'); this.acting.set(false); }
    });
  }
}
