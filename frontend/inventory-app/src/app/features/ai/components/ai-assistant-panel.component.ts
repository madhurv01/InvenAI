import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiAssistantService } from '../services/ai-assistant.service';
import { AiChatMessage } from '../../../shared/models/models';

@Component({
  selector: 'app-ai-assistant-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card ai-panel">
      <div class="ai-header">
        <span class="ai-icon">🤖</span>
        <div>
          <h3>AI Inventory Assistant</h3>
          <p class="ai-subtitle">Ask about low stock, recent movements, or an overview.</p>
        </div>
      </div>

      <div class="ai-messages" #scrollAnchor>
        <div class="ai-empty" *ngIf="messages().length === 0">
          Try: "Which products are low in stock?" or "What needs attention?"
        </div>
        <div *ngFor="let msg of messages()" class="ai-msg" [class.ai-msg-user]="msg.role === 'user'">
          <div class="ai-bubble">{{ msg.text }}</div>
        </div>
        <div class="ai-msg" *ngIf="loading()">
          <div class="ai-bubble ai-typing">Analyzing inventory data…</div>
        </div>
      </div>

      <div class="ai-suggestions" *ngIf="messages().length === 0">
        <button class="chip" (click)="ask('Which products are low in stock?')">Low stock products</button>
        <button class="chip" (click)="ask('Which products need attention?')">Needs attention</button>
        <button class="chip" (click)="ask('Give me an inventory summary')">Inventory summary</button>
      </div>

      <form class="ai-input-row" (ngSubmit)="submit()">
        <input
          class="form-control"
          [(ngModel)]="question"
          name="question"
          placeholder="Ask about your inventory…"
          [disabled]="loading()"
        />
        <button class="btn btn-primary" type="submit" [disabled]="loading() || !question.trim()">Ask</button>
      </form>
    </div>
  `,
  styles: [`
    .ai-panel { display: flex; flex-direction: column; height: 460px; }
    .ai-header { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 14px; }
    .ai-icon { font-size: 22px; }
    .ai-header h3 { margin: 0; font-size: 15px; }
    .ai-subtitle { margin: 2px 0 0 0; font-size: 12px; color: var(--color-text-muted); }
    .ai-messages {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 4px 2px;
      margin-bottom: 10px;
    }
    .ai-empty { color: var(--color-text-muted); font-size: 13px; text-align: center; margin-top: 30px; }
    .ai-msg { display: flex; }
    .ai-msg-user { justify-content: flex-end; }
    .ai-bubble {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 12px;
      background: #f3f4f6;
      font-size: 13.5px;
      white-space: pre-line;
      line-height: 1.5;
    }
    .ai-msg-user .ai-bubble { background: var(--color-primary); color: #fff; }
    .ai-typing { color: var(--color-text-muted); font-style: italic; }
    .ai-suggestions { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
    .chip {
      border: 1px solid var(--color-border);
      background: #fff;
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 12px;
      cursor: pointer;
    }
    .chip:hover { background: var(--color-primary-light); border-color: var(--color-primary); }
    .ai-input-row { display: flex; gap: 8px; }
    .ai-input-row .form-control { flex: 1; }
  `]
})
export class AiAssistantPanelComponent {
  messages = signal<AiChatMessage[]>([]);
  loading = signal(false);
  question = '';

  constructor(private aiService: AiAssistantService) {}

  ask(text: string): void {
    this.question = text;
    this.submit();
  }

  submit(): void {
    const text = this.question.trim();
    if (!text || this.loading()) return;

    this.messages.update(m => [...m, { role: 'user', text, timestamp: new Date() }]);
    this.question = '';
    this.loading.set(true);

    this.aiService.ask(text).subscribe({
      next: (res) => {
        this.messages.update(m => [...m, { role: 'assistant', text: res.answer, timestamp: new Date() }]);
        this.loading.set(false);
      },
      error: () => {
        this.messages.update(m => [...m, {
          role: 'assistant',
          text: 'Sorry, I could not reach the inventory assistant right now. Please try again.',
          timestamp: new Date()
        }]);
        this.loading.set(false);
      }
    });
  }
}
