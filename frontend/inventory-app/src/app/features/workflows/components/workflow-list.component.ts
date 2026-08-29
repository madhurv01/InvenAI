import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { WorkflowService } from '../services/workflow.service';
import { WorkflowSummary } from '../../../shared/models/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

interface WorkflowTypeOption {
  type: 'alert' | 'trigger' | 'supplychain';
  icon: string;
  title: string;
  description: string;
  accent: string;
}

const TYPE_OPTIONS: WorkflowTypeOption[] = [
  {
    type: 'alert',
    icon: '⚠️',
    title: 'Alert Workflow',
    description: 'Email me when stock at a warehouse drops below a threshold.',
    accent: '#f59e0b'
  },
  {
    type: 'trigger',
    icon: '🚢',
    title: 'Trigger Workflow',
    description: 'Auto-ship a package order at a scheduled time, then email a completion report.',
    accent: '#4f46e5'
  },
  {
    type: 'supplychain',
    icon: '🔗',
    title: 'Supply Chain Workflow',
    description: 'Continuously monitor a product at a warehouse — stock level and shipment status.',
    accent: '#10b981'
  }
];

@Component({
  selector: 'app-workflow-list',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent],
  template: `
    <div class="page-header fade-in">
      <div>
        <h1>Automate Workflow</h1>
        <p style="color: var(--color-text-muted); margin: 0;">Set up alerts, scheduled shipments, and supply-chain monitors that run automatically.</p>
      </div>
      <button class="btn btn-primary" (click)="showPicker.set(true)">+ Create Workflow</button>
    </div>

    <app-loading-spinner *ngIf="loading()"></app-loading-spinner>
    <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

    <div class="card slide-up" *ngIf="!loading()">
      <div class="empty-state" *ngIf="workflows().length === 0">
        No workflows yet. Click "+ Create Workflow" to automate an alert, a scheduled shipment, or a supply-chain monitor.
      </div>

      <div style="overflow-x:auto" *ngIf="workflows().length > 0">
        <table class="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th>Summary</th>
              <th>Status</th>
              <th>Last Run</th>
              <th>Last Triggered</th>
              <th></th>
            </tr>
          </thead>
          <tbody class="stagger">
            <tr *ngFor="let w of workflows(); trackBy: trackById" class="clickable-row" (click)="router.navigate(['/workflows', w.id])">
              <td>
                <span class="type-chip" [class.type-alert]="w.type === 'Alert'" [class.type-trigger]="w.type === 'Trigger'" [class.type-supplychain]="w.type === 'SupplyChain'">
                  {{ typeIcon(w.type) }} {{ w.type === 'SupplyChain' ? 'Supply Chain' : w.type }}
                </span>
              </td>
              <td><strong>{{ w.name }}</strong></td>
              <td class="summary-cell">{{ w.summary }}</td>
              <td>
                <span class="badge"
                      [class.badge-success]="w.status === 'Active'"
                      [class.badge-neutral]="w.status === 'Paused'"
                      [class.badge-info]="w.status === 'Completed'"
                      [class.badge-danger]="w.status === 'Failed'">
                  {{ w.status }}
                </span>
              </td>
              <td>{{ w.lastRunAt ? (w.lastRunAt | date:'MMM d, h:mm a') : '—' }}</td>
              <td>{{ w.lastTriggeredAt ? (w.lastTriggeredAt | date:'MMM d, h:mm a') : '—' }}</td>
              <td><span class="chevron">›</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="modal-backdrop" *ngIf="showPicker()" (click)="showPicker.set(false)">
      <div class="picker-panel scale-in" (click)="$event.stopPropagation()">
        <h2>Create Workflow</h2>
        <p class="picker-subtitle">Choose what you'd like to automate.</p>

        <div class="type-grid">
          <button
            *ngFor="let opt of typeOptions; let i = index"
            class="type-card"
            [style.animationDelay.ms]="i * 60"
            [style.--accent]="opt.accent"
            (click)="selectType(opt.type)">
            <div class="type-card-icon">{{ opt.icon }}</div>
            <div class="type-card-title">{{ opt.title }}</div>
            <div class="type-card-desc">{{ opt.description }}</div>
          </button>
        </div>

        <button class="btn btn-secondary close-btn" (click)="showPicker.set(false)">Cancel</button>
      </div>
    </div>
  `,
  styles: [`
    .clickable-row { cursor: pointer; }
    .clickable-row:hover { background: #f9fafb; }
    .summary-cell { font-size: 12.5px; color: var(--color-text-muted); max-width: 280px; }
    .chevron { color: var(--color-text-muted); font-size: 16px; }
    .badge-info { background: #e0e7ff; color: #4338ca; }

    .type-chip { font-size: 11.5px; font-weight: 700; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
    .type-alert { background: #fef3c7; color: #92400e; }
    .type-trigger { background: #e0e7ff; color: #4338ca; }
    .type-supplychain { background: #d1fae5; color: #065f46; }

    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(2px);
      display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px;
    }
    .picker-panel {
      background: #fff; border-radius: 18px; padding: 28px; max-width: 720px; width: 100%;
      box-shadow: 0 24px 60px rgba(0,0,0,0.25);
    }
    .picker-panel h2 { margin: 0 0 4px; }
    .picker-subtitle { color: var(--color-text-muted); font-size: 13px; margin: 0 0 22px; }

    .type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
    @media (max-width: 700px) { .type-grid { grid-template-columns: 1fr; } }

    .type-card {
      border: 2px solid var(--color-border);
      border-radius: 14px;
      background: #fff;
      padding: 20px 16px;
      text-align: left;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      animation: cardIn 0.35s ease both;
    }
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .type-card:hover {
      transform: translateY(-4px);
      border-color: var(--accent);
      box-shadow: 0 12px 28px rgba(0,0,0,0.12);
    }
    .type-card-icon {
      width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
      font-size: 21px; background: color-mix(in srgb, var(--accent) 15%, white);
    }
    .type-card-title { font-size: 14.5px; font-weight: 700; color: var(--color-text); }
    .type-card-desc { font-size: 12px; color: var(--color-text-muted); line-height: 1.4; }

    .close-btn { width: 100%; }
  `]
})
export class WorkflowListComponent implements OnInit {
  trackById = (_: number, item: WorkflowSummary) => item.id;

  workflows = signal<WorkflowSummary[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  showPicker = signal(false);
  typeOptions = TYPE_OPTIONS;

  constructor(private workflowService: WorkflowService, public router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.workflowService.getAll().subscribe({
      next: (data) => {
        this.workflows.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.friendlyMessage || 'Failed to load workflows.');
        this.loading.set(false);
      }
    });
  }

  selectType(type: 'alert' | 'trigger' | 'supplychain'): void {
    this.showPicker.set(false);
    this.router.navigate(['/workflows/new', type]);
  }

  typeIcon(type: string): string {
    return type === 'Alert' ? '⚠️' : type === 'Trigger' ? '🚢' : '🔗';
  }
}
