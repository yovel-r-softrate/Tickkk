import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AiSubtasksResponse {
  status: string;
  message: string;
  data: { subtasks: string[] };
}

export interface AiDescriptionResponse {
  status: string;
  message: string;
  data: { description: string };
}

export interface AiSummaryResponse {
  status: string;
  message: string;
  data: { summary: string };
}

export interface AiPriorityResponse {
  status: string;
  message: string;
  data: { priority: 'Low' | 'Medium' | 'High'; reason: string };
}

export interface AiAskResponse {
  status: string;
  message: string;
  data: { answer: string };
}

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private apiUrl = `${environment.apiUrl}/ai`;
  private http = inject(HttpClient);

  suggestSubtasks(title: string, description?: string): Observable<AiSubtasksResponse> {
    return this.http.post<AiSubtasksResponse>(`${this.apiUrl}/suggest-subtasks`, { title, description });
  }

  improveDescription(title: string, description?: string): Observable<AiDescriptionResponse> {
    return this.http.post<AiDescriptionResponse>(`${this.apiUrl}/improve-description`, { title, description });
  }

  summarizeTasks(tasks: any[]): Observable<AiSummaryResponse> {
    return this.http.post<AiSummaryResponse>(`${this.apiUrl}/summarize-tasks`, { tasks });
  }

  suggestPriority(title: string, description?: string, deadline?: string): Observable<AiPriorityResponse> {
    return this.http.post<AiPriorityResponse>(`${this.apiUrl}/suggest-priority`, { title, description, deadline });
  }

  askAssistant(question: string, context?: string): Observable<AiAskResponse> {
    return this.http.post<AiAskResponse>(`${this.apiUrl}/ask`, { question, context });
  }
}
