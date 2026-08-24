import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, signal } from '@angular/core';
import { ChatWindowComponent } from './chat-window.component';
import { ChatService } from '../services/chat.service';
import { ChatConversationSummary, ChatMessage } from '../../../shared/models/models';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, ChatWindowComponent],
  template: `
    <div class="page-header fade-in">
      <div>
        <h1>InvenChat</h1>
        <p style="color: var(--color-text-muted); margin: 0;">Ask questions about your inventory in plain English.</p>
      </div>
    </div>

    <div class="chat-layout slide-up">
      <aside class="card history-panel">
        <button class="btn btn-primary new-chat-btn" (click)="startNew()">+ New chat</button>

        <div class="history-list">
          <div class="history-empty" *ngIf="conversations().length === 0">
            No past conversations yet. Ask something to start one.
          </div>
          <div
            *ngFor="let c of conversations()"
            class="history-item"
            [class.active]="c.id === activeId()"
            (click)="openConversation(c.id)">
            <span class="history-title">{{ c.title }}</span>
            <button class="history-delete" (click)="deleteConversation(c.id, $event)" title="Delete conversation">🗑</button>
          </div>
        </div>
      </aside>

      <div class="card chat-page-card">
        <app-chat-window [showHeader]="false" (conversationStarted)="onConversationStarted($event)"></app-chat-window>
      </div>
    </div>
  `,
  styles: [`
    .chat-layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 20px;
      align-items: start;
      height: calc(100vh - 150px);
      min-height: 420px;
    }
    @media (max-width: 780px) { .chat-layout { grid-template-columns: 1fr; height: auto; } }

    .history-panel { display: flex; flex-direction: column; height: 100%; padding: 14px; }
    .new-chat-btn { width: 100%; margin-bottom: 12px; }
    .history-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
    .history-empty { font-size: 12.5px; color: var(--color-text-muted); text-align: center; margin-top: 20px; }
    .history-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 9px 10px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
    }
    .history-item:hover { background: #f3f4f6; }
    .history-item.active { background: var(--color-primary-light); color: var(--color-primary); font-weight: 600; }
    .history-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .history-delete {
      border: none; background: transparent; cursor: pointer; opacity: 0;
      font-size: 12px; padding: 2px 4px; border-radius: 4px;
    }
    .history-item:hover .history-delete { opacity: 0.6; }
    .history-delete:hover { opacity: 1 !important; background: rgba(0,0,0,0.06); }

    .chat-page-card { height: 100%; display: flex; flex-direction: column; }
  `]
})
export class ChatPageComponent implements OnInit {
  @ViewChild(ChatWindowComponent) chatWindow!: ChatWindowComponent;

  conversations = signal<ChatConversationSummary[]>([]);
  activeId = signal<string | undefined>(undefined);

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    this.loadConversations();
  }

  loadConversations(): void {
    this.chatService.getConversations().subscribe({
      next: (list) => this.conversations.set(list),
      error: () => {}
    });
  }

  startNew(): void {
    this.activeId.set(undefined);
    this.chatWindow.startNew();
  }

  openConversation(id: string): void {
    if (id === this.activeId()) return;
    this.chatService.getConversation(id).subscribe({
      next: (detail) => {
        this.activeId.set(id);
        const messages: ChatMessage[] = detail.messages.map(m => ({
          role: m.role,
          text: m.content,
          timestamp: new Date(m.createdAt)
        }));
        this.chatWindow.loadConversation(id, messages);
      },
      error: () => {}
    });
  }

  deleteConversation(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.chatService.deleteConversation(id).subscribe({
      next: () => {
        this.conversations.update(list => list.filter(c => c.id !== id));
        if (id === this.activeId()) this.startNew();
      },
      error: () => {}
    });
  }

  onConversationStarted(id: string): void {
    this.activeId.set(id);
    this.loadConversations();
  }
}
