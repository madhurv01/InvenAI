import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChatWindowComponent } from './chat-window.component';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, RouterLink, ChatWindowComponent],
  template: `
    <div class="chat-popover" *ngIf="open()">
      <app-chat-window [closable]="true" (close)="toggle()"></app-chat-window>
      <a routerLink="/chat" class="open-full-link" (click)="open.set(false)">Open InvenChat ↗</a>
    </div>

    <button class="chat-fab" (click)="toggle()" [class.active]="open()" title="InvenChat">
      <span *ngIf="!open()">💬</span>
      <span *ngIf="open()">✕</span>
    </button>
  `,
  styles: [`
    :host {
      position: fixed;
      left: 24px;
      bottom: 24px;
      z-index: 1000;
    }
    .chat-fab {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      border: none;
      background: var(--color-primary);
      color: #fff;
      font-size: 22px;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.18s ease, background 0.18s ease;
    }
    .chat-fab:hover { transform: scale(1.06); }
    .chat-fab.active { background: var(--color-primary-dark, var(--color-primary)); }

    .chat-popover {
      position: absolute;
      left: 0;
      bottom: 66px;
      width: 340px;
      height: 460px;
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.22);
      border: 1px solid var(--color-border);
      padding: 16px;
      display: flex;
      flex-direction: column;
      animation: popIn 0.16s ease;
    }
    @keyframes popIn {
      from { opacity: 0; transform: translateY(8px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .open-full-link {
      display: block;
      text-align: center;
      font-size: 12px;
      color: var(--color-primary);
      margin-top: 8px;
      text-decoration: none;
    }
    .open-full-link:hover { text-decoration: underline; }
  `]
})
export class ChatWidgetComponent {
  open = signal(false);

  toggle(): void {
    this.open.update(v => !v);
  }
}
