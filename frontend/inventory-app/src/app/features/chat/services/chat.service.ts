import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ChatConversationDetail, ChatConversationSummary, ChatResponse } from '../../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class ChatService {
  constructor(private api: ApiService) {}

  ask(question: string, conversationId?: string): Observable<ChatResponse> {
    return this.api.post<ChatResponse>('/chat/ask', { question, conversationId: conversationId ?? null });
  }

  getConversations(): Observable<ChatConversationSummary[]> {
    return this.api.get<ChatConversationSummary[]>('/chat/conversations');
  }

  getConversation(id: string): Observable<ChatConversationDetail> {
    return this.api.get<ChatConversationDetail>(`/chat/conversations/${id}`);
  }

  deleteConversation(id: string): Observable<void> {
    return this.api.delete<void>(`/chat/conversations/${id}`);
  }
}
