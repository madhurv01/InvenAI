import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type NodeState = 'pending' | 'active' | 'done';

@Component({
  selector: 'app-workflow-node',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="node-wrap">
      <div class="node-card" [class.node-active]="state === 'active'" [class.node-done]="state === 'done'" [class.node-pending]="state === 'pending'">
        <div class="node-header">
          <div class="node-icon">
            <span *ngIf="state !== 'done'">{{ icon }}</span>
            <span *ngIf="state === 'done'" class="check">✓</span>
          </div>
          <div class="node-titles">
            <div class="node-step">STEP {{ stepNumber }}</div>
            <div class="node-title">{{ title }}</div>
          </div>
        </div>
        <div class="node-body" *ngIf="state === 'active'">
          <ng-content></ng-content>
        </div>
        <div class="node-summary" *ngIf="state === 'done' && summary">{{ summary }}</div>
      </div>

      <div class="connector" *ngIf="!isLast">
        <div class="connector-line" [class.connector-active]="state === 'done'"></div>
        <div class="connector-dot" [class.connector-dot-active]="state === 'done'"></div>
      </div>
    </div>
  `,
  styles: [`
    .node-wrap { display: flex; flex-direction: column; }
    .node-card {
      border: 2px solid var(--color-border);
      border-radius: 14px;
      background: #fff;
      padding: 16px 18px;
      transition: border-color 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease, transform 0.3s ease;
      opacity: 0.55;
    }
    .node-pending { opacity: 0.45; }
    .node-active {
      opacity: 1;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 4px var(--color-primary-light), 0 8px 24px rgba(79, 70, 229, 0.15);
      animation: nodeAppear 0.35s ease;
    }
    .node-done {
      opacity: 1;
      border-color: #10b981;
      background: #f0fdf9;
    }
    @keyframes nodeAppear {
      from { transform: translateY(-6px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .node-header { display: flex; align-items: center; gap: 12px; }
    .node-icon {
      width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 19px; background: #f3f4f6; color: var(--color-text-muted);
      transition: background 0.3s ease, color 0.3s ease;
    }
    .node-active .node-icon { background: var(--color-primary); color: #fff; }
    .node-done .node-icon { background: #10b981; color: #fff; }
    .node-icon .check { font-weight: 800; }

    .node-step { font-size: 10px; font-weight: 800; letter-spacing: 0.06em; color: var(--color-text-muted); }
    .node-title { font-size: 14.5px; font-weight: 700; color: var(--color-text); }

    .node-body { margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--color-border); }
    .node-summary { margin-top: 8px; font-size: 12.5px; color: #047857; padding-left: 52px; }

    .connector { display: flex; flex-direction: column; align-items: center; height: 28px; position: relative; }
    .connector-line {
      width: 2px; flex: 1; background: var(--color-border);
      transition: background 0.4s ease;
    }
    .connector-active { background: #10b981; }
    .connector-dot {
      width: 6px; height: 6px; border-radius: 50%; background: var(--color-border);
      margin-top: -1px; transition: background 0.4s ease, transform 0.4s ease;
    }
    .connector-dot-active { background: #10b981; animation: dotPulse 0.5s ease; }
    @keyframes dotPulse {
      0% { transform: scale(0.4); }
      60% { transform: scale(1.4); }
      100% { transform: scale(1); }
    }
  `]
})
export class WorkflowNodeComponent {
  @Input() stepNumber = 1;
  @Input() title = '';
  @Input() icon = '⚙️';
  @Input() state: NodeState = 'pending';
  @Input() summary = '';
  @Input() isLast = false;
}
