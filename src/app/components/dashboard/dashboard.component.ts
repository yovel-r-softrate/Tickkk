import { Component, inject, OnInit, signal } from '@angular/core';
import { TaskService } from '../../services/task.service';
import { AiService } from '../../services/ai.service';
import { NgClass, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  imports: [NgClass, DecimalPipe, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  stats = signal<any>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  aiSummary = signal<string | null>(null);
  aiSummaryLoading = signal<boolean>(false);

  taskService = inject(TaskService);
  aiService = inject(AiService);

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.loading.set(true);
    this.taskService.getTaskStats().subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.stats.set(response.data);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading stats:', err);
        this.error.set('Failed to load dashboard statistics');
        this.loading.set(false);
      }
    });
  }

  getCompletionPercentage(): number {
    const s = this.stats();
    if (!s || s.total === 0) return 0;
    return (s.completed / s.total) * 100;
  }

  generateAiSummary() {
    this.aiSummaryLoading.set(true);
    this.aiSummary.set(null);

    this.taskService.getAllTasks().subscribe({
      next: (response: any) => {
        const tasks = response.data?.tasks || response.data || [];
        if (tasks.length === 0) {
          this.aiSummary.set('No tasks found to summarize.');
          this.aiSummaryLoading.set(false);
          return;
        }
        this.aiService.summarizeTasks(tasks).subscribe({
          next: (aiResponse) => {
            this.aiSummary.set(aiResponse.data.summary);
            this.aiSummaryLoading.set(false);
          },
          error: () => {
            this.aiSummary.set('Unable to generate summary at this time.');
            this.aiSummaryLoading.set(false);
          }
        });
      },
      error: () => {
        this.aiSummary.set('Unable to fetch tasks for summary.');
        this.aiSummaryLoading.set(false);
      }
    });
  }
}
