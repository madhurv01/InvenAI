import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { WorkflowService } from '../services/workflow.service';
import { PackageOrderService } from '../../package-orders/services/package-order.service';
import { GeocodingService } from '../../shipments/services/geocoding.service';
import { GeocodeResult, PackageOrderPending } from '../../../shared/models/models';
import { WorkflowNodeComponent } from './workflow-node.component';

interface LocationSlot {
  name: string;
  lat: number | null;
  lng: number | null;
  query: string;
  suggestions: GeocodeResult[];
  showSuggestions: boolean;
}

@Component({
  selector: 'app-workflow-create-trigger',
  standalone: true,
  imports: [CommonModule, FormsModule, WorkflowNodeComponent],
  template: `
    <div class="page-header fade-in">
      <div>
        <h1>🚢 New Trigger Workflow</h1>
        <p style="color: var(--color-text-muted); margin: 0;">Auto-ship a package order at a scheduled time, then email a completion report.</p>
      </div>
      <button class="btn btn-secondary" (click)="router.navigate(['/workflows'])">← Back to Workflows</button>
    </div>

    <div class="card wizard-card slide-up">
      <app-workflow-node [stepNumber]="1" title="Select Package Order" icon="📦"
        [state]="step() === 1 ? 'active' : (step() > 1 ? 'done' : 'pending')"
        [summary]="step() > 1 ? selectedOrderLabel() : ''" [isLast]="false">
        <select class="form-control" [ngModel]="packageOrderId" (ngModelChange)="onOrderSelected($event)">
          <option [ngValue]="null">Select a pending package order…</option>
          <option *ngFor="let o of pendingOrders()" [ngValue]="o.id">
            {{ o.orderNumber }} — {{ o.warehouseName }} ({{ o.itemCount }} item(s))
          </option>
        </select>
        <p class="hint" *ngIf="pendingOrders().length === 0">No pending package orders available. Create one first.</p>
        <button class="btn btn-primary next-btn" [disabled]="!packageOrderId" (click)="goTo(2)">Next →</button>
      </app-workflow-node>

      <app-workflow-node [stepNumber]="2" title="Schedule Ship Time" icon="⏰"
        [state]="step() === 2 ? 'active' : (step() > 2 ? 'done' : 'pending')"
        [summary]="step() > 2 && scheduledAt ? ((scheduledAt | date:'MMM d, y, h:mm a') ?? '') : ''" [isLast]="false">
        <label class="field-label">Automatically create the shipment at:</label>
        <input type="datetime-local" class="form-control" [(ngModel)]="scheduledAt" [min]="minDateTime" />
        <div class="btn-row">
          <button class="btn btn-secondary" (click)="goTo(1)">← Back</button>
          <button class="btn btn-primary next-btn" [disabled]="!scheduledAt" (click)="goTo(3)">Next →</button>
        </div>
      </app-workflow-node>

      <app-workflow-node [stepNumber]="3" title="Origin & Destination" icon="🗺️"
        [state]="step() === 3 ? 'active' : (step() > 3 ? 'done' : 'pending')"
        [summary]="step() > 3 ? (origin.name + ' → ' + destination.name) : ''" [isLast]="false">
        <label class="field-label">Origin <span class="prefill-note" *ngIf="origin.query">(pre-filled from warehouse)</span></label>
        <div class="location-field">
          <input class="form-control" [(ngModel)]="origin.query" (ngModelChange)="onQueryChange('origin', $event)" (focus)="origin.showSuggestions = true" placeholder="Search an address…" />
          <div class="suggestions" *ngIf="origin.showSuggestions && origin.suggestions.length > 0">
            <div class="suggestion-item" *ngFor="let s of origin.suggestions" (click)="selectSuggestion('origin', s)">{{ s.displayName }}</div>
          </div>
          <div class="coord-chip" *ngIf="origin.lat !== null">✓ Located</div>
        </div>

        <label class="field-label" style="margin-top:14px;">Destination</label>
        <div class="location-field">
          <input class="form-control" [(ngModel)]="destination.query" (ngModelChange)="onQueryChange('destination', $event)" (focus)="destination.showSuggestions = true" placeholder="Search an address…" />
          <div class="suggestions" *ngIf="destination.showSuggestions && destination.suggestions.length > 0">
            <div class="suggestion-item" *ngFor="let s of destination.suggestions" (click)="selectSuggestion('destination', s)">{{ s.displayName }}</div>
          </div>
          <div class="coord-chip" *ngIf="destination.lat !== null">✓ Located</div>
        </div>

        <div class="btn-row">
          <button class="btn btn-secondary" (click)="goTo(2)">← Back</button>
          <button class="btn btn-primary next-btn" [disabled]="origin.lat === null || destination.lat === null" (click)="goTo(4)">Next →</button>
        </div>
      </app-workflow-node>

      <app-workflow-node [stepNumber]="4" title="Configure Report Email" icon="📧"
        [state]="step() === 4 ? 'active' : (step() > 4 ? 'done' : 'pending')"
        [summary]="step() > 4 ? recipientEmail : ''" [isLast]="false">
        <label class="field-label">Send the completion report to:</label>
        <input type="email" class="form-control" [(ngModel)]="recipientEmail" placeholder="you@example.com" />
        <div class="btn-row">
          <button class="btn btn-secondary" (click)="goTo(3)">← Back</button>
          <button class="btn btn-primary next-btn" [disabled]="!isValidEmail(recipientEmail)" (click)="goTo(5)">Next →</button>
        </div>
      </app-workflow-node>

      <app-workflow-node [stepNumber]="5" title="Review & Activate" icon="🚀"
        [state]="step() === 5 ? 'active' : 'pending'" [isLast]="true">
        <label class="field-label">Workflow name</label>
        <input class="form-control" [(ngModel)]="name" placeholder="e.g. Auto-ship Friday orders" />

        <div class="review-box">
          <div class="review-row"><span>Package Order</span><strong>{{ selectedOrderLabel() }}</strong></div>
          <div class="review-row"><span>Ship at</span><strong>{{ scheduledAt | date:'MMM d, y, h:mm a' }}</strong></div>
          <div class="review-row"><span>Route</span><strong>{{ origin.name }} → {{ destination.name }}</strong></div>
          <div class="review-row"><span>Recipient</span><strong>{{ recipientEmail }}</strong></div>
        </div>

        <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

        <div class="btn-row">
          <button class="btn btn-secondary" (click)="goTo(4)">← Back</button>
          <button class="btn btn-primary next-btn" [disabled]="!name.trim() || submitting()" (click)="submit()">
            {{ submitting() ? 'Activating…' : '⚡ Activate Workflow' }}
          </button>
        </div>
      </app-workflow-node>
    </div>
  `,
  styles: [`
    .wizard-card { max-width: 640px; padding: 24px; }
    .field-label { font-size: 12.5px; font-weight: 700; color: var(--color-text); display: block; margin-bottom: 8px; }
    .prefill-note { font-weight: 400; color: var(--color-text-muted); font-size: 11px; }
    .hint { font-size: 12px; color: var(--color-text-muted); margin: 6px 0 0; }
    .next-btn { margin-top: 12px; }
    .btn-row { display: flex; gap: 8px; margin-top: 12px; }
    .btn-row .btn { flex: 1; }

    .location-field { position: relative; }
    .suggestions {
      position: absolute; top: 100%; left: 0; right: 0; z-index: 500;
      background: #fff; border: 1px solid var(--color-border); border-radius: 10px;
      margin-top: 4px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); max-height: 200px; overflow-y: auto;
    }
    .suggestion-item { padding: 9px 12px; font-size: 12.5px; cursor: pointer; border-bottom: 1px solid #f3f4f6; }
    .suggestion-item:last-child { border-bottom: none; }
    .suggestion-item:hover { background: var(--color-primary-light); }
    .coord-chip { font-size: 11.5px; color: #10b981; font-weight: 600; margin-top: 4px; }

    .review-box { background: #f9fafb; border-radius: 10px; padding: 12px 14px; margin: 14px 0; display: flex; flex-direction: column; gap: 6px; }
    .review-row { display: flex; justify-content: space-between; gap: 10px; font-size: 12.5px; }
    .review-row span { color: var(--color-text-muted); white-space: nowrap; }
    .review-row strong { text-align: right; overflow: hidden; text-overflow: ellipsis; }
  `]
})
export class WorkflowCreateTriggerComponent implements OnInit {
  pendingOrders = signal<PackageOrderPending[]>([]);
  step = signal(1);
  submitting = signal(false);
  errorMessage = signal('');
  minDateTime = new Date().toISOString().slice(0, 16);

  packageOrderId: string | null = null;
  scheduledAt = '';
  recipientEmail = '';
  name = '';

  origin: LocationSlot = { name: '', lat: null, lng: null, query: '', suggestions: [], showSuggestions: false };
  destination: LocationSlot = { name: '', lat: null, lng: null, query: '', suggestions: [], showSuggestions: false };

  private originQuery$ = new Subject<string>();
  private destQuery$ = new Subject<string>();

  constructor(
    private workflowService: WorkflowService,
    private packageOrderService: PackageOrderService,
    private geocoding: GeocodingService,
    public router: Router
  ) {
    this.originQuery$.pipe(debounceTime(400), distinctUntilChanged(), switchMap(q => this.geocoding.search(q)))
      .subscribe(results => this.origin.suggestions = results);
    this.destQuery$.pipe(debounceTime(400), distinctUntilChanged(), switchMap(q => this.geocoding.search(q)))
      .subscribe(results => this.destination.suggestions = results);
  }

  ngOnInit(): void {
    this.packageOrderService.getPending().subscribe({ next: (o) => this.pendingOrders.set(o), error: () => {} });
  }

  goTo(step: number): void {
    this.step.set(step);
  }

  onOrderSelected(id: string | null): void {
    this.packageOrderId = id;
    if (!id) return;
    const order = this.pendingOrders().find(o => o.id === id);
    if (!order) return;

    const query = order.warehouseLocation ? `${order.warehouseName}, ${order.warehouseLocation}` : order.warehouseName;
    this.origin.query = query;
    this.geocoding.search(query).subscribe({
      next: (results) => { if (results.length > 0) this.selectSuggestion('origin', results[0]); },
      error: () => {}
    });
  }

  selectedOrderLabel(): string {
    return this.pendingOrders().find(o => o.id === this.packageOrderId)?.orderNumber || '';
  }

  onQueryChange(slot: 'origin' | 'destination', value: string): void {
    this[slot].showSuggestions = true;
    (slot === 'origin' ? this.originQuery$ : this.destQuery$).next(value);
  }

  selectSuggestion(slot: 'origin' | 'destination', result: GeocodeResult): void {
    const s = this[slot];
    s.name = result.displayName;
    s.query = result.displayName;
    s.lat = result.lat;
    s.lng = result.lng;
    s.suggestions = [];
    s.showSuggestions = false;
  }

  isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  submit(): void {
    if (!this.packageOrderId || !this.scheduledAt || this.origin.lat === null || this.destination.lat === null) return;
    this.submitting.set(true);
    this.errorMessage.set('');

    this.workflowService.createTrigger({
      name: this.name.trim(),
      packageOrderId: this.packageOrderId,
      scheduledAt: new Date(this.scheduledAt).toISOString(),
      originName: this.origin.name || this.origin.query,
      originLat: this.origin.lat!,
      originLng: this.origin.lng!,
      destinationName: this.destination.name || this.destination.query,
      destinationLat: this.destination.lat!,
      destinationLng: this.destination.lng!,
      recipientEmail: this.recipientEmail.trim()
    }).subscribe({
      next: (wf) => this.router.navigate(['/workflows', wf.id]),
      error: (err) => {
        this.errorMessage.set(err.friendlyMessage || 'Failed to create workflow.');
        this.submitting.set(false);
      }
    });
  }
}
