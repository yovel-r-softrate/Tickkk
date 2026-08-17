import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { AiService } from '../../services/ai.service';
import { AuthService } from '../../services/auth.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-ai-assistant',
  imports: [FormsModule, NgClass],
  templateUrl: './ai-assistant.component.html',
})
export class AiAssistantComponent {
  isOpen = signal(false);
  isLoading = signal(false);
  messages = signal<ChatMessage[]>([]);
  userInput = '';

  private aiService = inject(AiService);
  private authService = inject(AuthService);

  toggle() {
    this.isOpen.update(v => !v);
    if (this.isOpen() && this.messages().length === 0) {
      this.messages.set([{
        role: 'assistant',
        content: 'Hi! I\'m your AI project assistant powered by Gemini. Ask me anything about task management, productivity tips, or how to organize your work.'
      }]);
    }
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  sendMessage() {
    const question = this.userInput.trim();
    if (!question || this.isLoading()) return;

    this.messages.update(msgs => [...msgs, { role: 'user', content: question }]);
    this.userInput = '';
    this.isLoading.set(true);

    this.aiService.askAssistant(question).subscribe({
      next: (response) => {
        this.messages.update(msgs => [...msgs, { role: 'assistant', content: response.data.answer }]);
        this.isLoading.set(false);
      },
      error: (err) => {
        const serverMsg = err?.error?.message;
        let content = 'Sorry, I encountered an error. Please try again.';
        if (err.status === 429 || serverMsg?.toLowerCase().includes('rate limit')) {
          content = 'AI rate limit reached. Please wait a moment and try again.';
        } else if (err.status === 503) {
          content = 'AI service is temporarily unavailable. Please try again later.';
        } else if (serverMsg) {
          content = serverMsg;
        }
        this.messages.update(msgs => [...msgs, { role: 'assistant', content }]);
        this.isLoading.set(false);
      }
    });
  }

  clearChat() {
    this.messages.set([{
      role: 'assistant',
      content: 'Chat cleared. How can I help you?'
    }]);
  }
}
