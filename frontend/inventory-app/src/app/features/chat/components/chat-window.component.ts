import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../services/chat.service';
import { ChatMessage } from '../../../shared/models/models';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-window" [class.compact]="compact">
      <div class="chat-header" *ngIf="showHeader">
        <span class="chat-icon">💬</span>
        <div>
          <h3>InvenChat</h3>
          <p class="chat-subtitle">Ask anything about your inventory data.</p>
        </div>
        <button class="close-btn" *ngIf="closable" (click)="close.emit()" aria-label="Close chat">✕</button>
      </div>

      <div class="chat-messages">
        <div class="chat-empty" *ngIf="messages().length === 0">
          Try: "Which products are low in stock?" or "What's the total inventory value by category?"
        </div>
        <div *ngFor="let msg of messages()" class="chat-msg" [class.chat-msg-user]="msg.role === 'user'">
          <div class="chat-bubble">{{ msg.text }}</div>
        </div>
        <div class="chat-msg" *ngIf="loading()">
          <div class="chat-bubble chat-typing">Thinking…</div>
        </div>
      </div>

      <div class="chat-suggestions" *ngIf="messages().length === 0">
        <button class="chip" (click)="ask('Which products are low in stock?')">Low stock products</button>
        <button class="chip" (click)="ask('Give me an inventory summary')">Inventory summary</button>
        <button class="chip" (click)="ask('Show recent stock movements')">Recent movements</button>
      </div>

      <form class="chat-input-row" (ngSubmit)="submit()">
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
    .chat-window { display: flex; flex-direction: column; height: 100%; }
    .chat-header { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 14px; }
    .chat-icon { font-size: 22px; }
    .chat-header h3 { margin: 0; font-size: 15px; }
    .chat-subtitle { margin: 2px 0 0 0; font-size: 12px; color: var(--color-text-muted); }
    .close-btn {
      margin-left: auto; border: none; background: transparent; cursor: pointer;
      font-size: 14px; color: var(--color-text-muted); padding: 4px 6px; border-radius: 6px;
    }
    .close-btn:hover { background: #f3f4f6; color: var(--color-text); }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 4px 2px;
      margin-bottom: 10px;
      min-height: 0;
    }
    .chat-empty { color: var(--color-text-muted); font-size: 13px; text-align: center; margin-top: 30px; }
    .chat-msg { display: flex; }
    .chat-msg-user { justify-content: flex-end; }
    .chat-bubble {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 12px;
      background: #f3f4f6;
      font-size: 13.5px;
      white-space: pre-line;
      line-height: 1.5;
    }
    .chat-msg-user .chat-bubble { background: var(--color-primary); color: #fff; }
    .chat-typing { color: var(--color-text-muted); font-style: italic; }
    .chat-suggestions { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
    .chip {
      border: 1px solid var(--color-border);
      background: #fff;
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 12px;
      cursor: pointer;
    }
    .chip:hover { background: var(--color-primary-light); border-color: var(--color-primary); }
    .chat-input-row { display: flex; gap: 8px; }
    .chat-input-row .form-control { flex: 1; }
  `]
})
export class ChatWindowComponent {
  @Input() showHeader = true;
  @Input() closable = false;
  @Input() compact = false;
  @Output() close = new EventEmitter<void>();
  @Output() conversationStarted = new EventEmitter<string>();

  messages = signal<ChatMessage[]>([]);
  loading = signal(false);
  question = '';

  private conversationId: string | undefined;

  constructor(private chatService: ChatService) {}

  /** Reset to a blank, unsaved conversation. */
  startNew(): void {
    this.conversationId = undefined;
    this.messages.set([]);
    this.question = '';
  }

  /** Load an existing conversation's full message history. */
  loadConversation(id: string, messages: ChatMessage[]): void {
    this.conversationId = id;
    this.messages.set(messages);
    this.question = '';
  }

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

    this.chatService.ask(text, this.conversationId).subscribe({
      next: (res) => {
        const isNew = !this.conversationId;
        this.conversationId = res.conversationId;
        this.messages.update(m => [...m, { role: 'assistant', text: res.answer, timestamp: new Date() }]);
        this.loading.set(false);
        if (isNew) this.conversationStarted.emit(res.conversationId);
      },
      error: () => {
        this.messages.update(m => [...m, {
          role: 'assistant',
          text: 'Sorry, I could not reach the chat assistant right now. Please try again.',
          timestamp: new Date()
        }]);
        this.loading.set(false);
      }
    });
  }
}
