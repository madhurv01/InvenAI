import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-wrap">
      <div class="spinner"></div>
      <span *ngIf="label">{{ label }}</span>
    </div>
  `,
  styles: [`
    .loading-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 32px;
      color: var(--color-text-muted);
      font-size: 14px;
    }
  `]
})
export class LoadingSpinnerComponent {
  @Input() label = 'Loading...';
}
