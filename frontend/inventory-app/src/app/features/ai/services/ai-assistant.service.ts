import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AiChatResponse } from '../../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class AiAssistantService {
  constructor(private api: ApiService) {}

  ask(question: string): Observable<AiChatResponse> {
    return this.api.post<AiChatResponse>('/aiassistant/ask', { question });
  }
}
