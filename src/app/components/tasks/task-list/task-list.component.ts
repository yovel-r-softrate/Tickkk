import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { TaskService } from '../../../services/task.service';
import { Task } from '../../../core/models/tasks.model';
import { RouterLink } from '@angular/router';
import { NgClass, DatePipe } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { DeadlineAlertPipe } from '../../../shared/pipes/deadline-alert.pipe';
import { ResizableColumnDirective } from '../../../shared/directives/resizable-column.directive';
import { WebsocketService } from '../../../services/websocket.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-task-list',
    imports: [RouterLink, NgClass, DatePipe, DeadlineAlertPipe, FormsModule, ResizableColumnDirective],
    templateUrl: './task-list.component.html',
})
export class TaskListComponent implements OnInit, OnDestroy {
  completedTasks = signal<Task[]>([]);
  pendingTasks = signal<Task[]>([]);

  activeTab = signal<'ongoing' | 'completed'>('ongoing');

  completedCurrentPage = signal<number>(1);
  pendingCurrentPage = signal<number>(1);

  completedItemsPerPage = signal<number>(10);
  pendingItemsPerPage = signal<number>(10);

  titleSearch = signal<string>('');
  descriptionSearch = signal<string>('');
  tagSearch = signal<string>('');
  prioritySearch = signal<string>('');

  taskService = inject(TaskService);
  auth = inject(AuthService);
  wsService = inject(WebsocketService);
  private subscriptions = new Subscription();

  completedLoading = signal<boolean>(false);
  pendingLoading = signal<boolean>(false);

  completedError = signal<string>('');
  pendingError = signal<string>('');

  // Search and Filter Signals
  searchQuery = signal<string>('');
  priorityFilter = signal<string>('');
  sortBy = signal<string>('deadline');
  sortOrder = signal<string>('asc');

  // Computed signals for filtering and sorting tasks client-side
  filteredPendingTasks = computed(() => {
    let tasks = this.pendingTasks();
    const query = this.searchQuery().toLowerCase().trim();
    const title = this.titleSearch().toLowerCase().trim();
    const desc = this.descriptionSearch().toLowerCase().trim();
    const tag = this.tagSearch().toLowerCase().trim();
    const priority = this.prioritySearch() || this.priorityFilter();

    if (query) {
      tasks = tasks.filter(t => 
        t.title.toLowerCase().includes(query) || 
        t.description.toLowerCase().includes(query)
      );
    }
    if (title) {
      tasks = tasks.filter(t => t.title.toLowerCase().includes(title));
    }
    if (desc) {
      tasks = tasks.filter(t => t.description.toLowerCase().includes(desc));
    }
    if (tag) {
      tasks = tasks.filter(t => t.tag?.toLowerCase().includes(tag));
    }
    if (priority) {
      tasks = tasks.filter(t => t.priority === priority);
    }

    // Sort the tasks
    const sortByField = this.sortBy();
    const order = this.sortOrder() === 'asc' ? 1 : -1;
    return [...tasks].sort((a, b) => {
      let valA = (a as any)[sortByField] || '';
      let valB = (b as any)[sortByField] || '';

      if (sortByField === 'deadline' || sortByField === 'createdAt') {
        const dateA = new Date(valA as string).getTime();
        const dateB = new Date(valB as string).getTime();
        return (dateA - dateB) * order;
      }
      if (sortByField === 'priority') {
        const priorityOrder: Record<string, number> = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 };
        const orderA = priorityOrder[valA as string] || 0;
        const orderB = priorityOrder[valB as string] || 0;
        return (orderA - orderB) * order;
      }
      return String(valA).localeCompare(String(valB)) * order;
    });
  });

  filteredCompletedTasks = computed(() => {
    let tasks = this.completedTasks();
    const query = this.searchQuery().toLowerCase().trim();
    const title = this.titleSearch().toLowerCase().trim();
    const desc = this.descriptionSearch().toLowerCase().trim();
    const tag = this.tagSearch().toLowerCase().trim();
    const priority = this.prioritySearch() || this.priorityFilter();

    if (query) {
      tasks = tasks.filter(t => 
        t.title.toLowerCase().includes(query) || 
        t.description.toLowerCase().includes(query)
      );
    }
    if (title) {
      tasks = tasks.filter(t => t.title.toLowerCase().includes(title));
    }
    if (desc) {
      tasks = tasks.filter(t => t.description.toLowerCase().includes(desc));
    }
    if (tag) {
      tasks = tasks.filter(t => t.tag?.toLowerCase().includes(tag));
    }
    if (priority) {
      tasks = tasks.filter(t => t.priority === priority);
    }

    // Sort the tasks
    const sortByField = this.sortBy();
    const order = this.sortOrder() === 'asc' ? 1 : -1;
    return [...tasks].sort((a, b) => {
      let valA = (a as any)[sortByField] || '';
      let valB = (b as any)[sortByField] || '';

      if (sortByField === 'deadline' || sortByField === 'createdAt') {
        const dateA = new Date(valA as string).getTime();
        const dateB = new Date(valB as string).getTime();
        return (dateA - dateB) * order;
      }
      if (sortByField === 'priority') {
        const priorityOrder: Record<string, number> = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 };
        const orderA = priorityOrder[valA as string] || 0;
        const orderB = priorityOrder[valB as string] || 0;
        return (orderA - orderB) * order;
      }
      return String(valA).localeCompare(String(valB)) * order;
    });
  });

  // Computed signals for pagination
  pendingPaginatedTasks = computed(() => {
    const tasks = this.filteredPendingTasks();
    const page = this.pendingCurrentPage();
    const limit = this.pendingItemsPerPage();
    const startIndex = (page - 1) * limit;
    return tasks.slice(startIndex, startIndex + limit);
  });

  completedPaginatedTasks = computed(() => {
    const tasks = this.filteredCompletedTasks();
    const page = this.completedCurrentPage();
    const limit = this.completedItemsPerPage();
    const startIndex = (page - 1) * limit;
    return tasks.slice(startIndex, startIndex + limit);
  });

  // Computed signals for totals and pages
  pendingTotalTasks = computed(() => this.filteredPendingTasks().length);
  completedTotalTasks = computed(() => this.filteredCompletedTasks().length);

  pendingTotalPages = computed(() => Math.ceil(this.filteredPendingTasks().length / this.pendingItemsPerPage()));
  completedTotalPages = computed(() => Math.ceil(this.filteredCompletedTasks().length / this.completedItemsPerPage()));

  private searchTimeout: any;

  constructor() {}

  ngOnInit() {
    this.refreshData();
    
    this.subscriptions.add(this.wsService.taskCreated$.subscribe(() => {
      this.refreshData();
    }));
    this.subscriptions.add(this.wsService.taskUpdated$.subscribe(() => {
      this.refreshData();
    }));
    this.subscriptions.add(this.wsService.taskDeleted$.subscribe(() => {
      this.refreshData();
    }));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  loadCompletedTasks(page: number, limit: number) {
    if (this.completedTasks().length === 0) {
      this.completedLoading.set(true);
    }
    // Fetch all records for client-side search/filters
    this.taskService.getCompletedTasks(1, 10000).subscribe({
      next: (response) => {
        if (response.status === 'success' && response.data) {
          this.completedTasks.set(response.data.tasks || []);
        } else {
          this.completedError.set('Invalid response format from server');
        }
        this.completedLoading.set(false);
      },
      error: (error) => {
        console.error('Error getting completed tasks:', error);
        this.completedError.set('Error getting completed tasks');
        this.completedLoading.set(false);
      },
    });
  }

  loadPendingTasks(page: number, limit: number) {
    if (this.pendingTasks().length === 0) {
      this.pendingLoading.set(true);
    }
    // Fetch all records for client-side search/filters
    this.taskService.getPendingTasks(1, 10000).subscribe({
      next: (response) => {
        if (response.status === 'success' && response.data) {
          this.pendingTasks.set(response.data.tasks || []);
        } else {
          this.pendingError.set('Invalid response format from server');
        }
        this.pendingLoading.set(false);
      },
      error: (error) => {
        console.error('Error getting pending tasks:', error);
        this.pendingError.set('Error getting pending tasks');
        this.pendingLoading.set(false);
      },
    });
  }

  loadUserTasks(page: number, limit: number) {
    this.loadPendingTasks(page, limit);
  }

  onFilterChange() {
    this.pendingCurrentPage.set(1);
    this.completedCurrentPage.set(1);
  }

  onSearchChange() {
    this.onFilterChange();
  }

  toggleSortOrder() {
    this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    this.onFilterChange();
  }

  nextCompletedPage() {
    if (this.completedCurrentPage() < this.completedTotalPages()) {
      this.completedCurrentPage.set(this.completedCurrentPage() + 1);
    }
  }

  nextPendingPage() {
    if (this.pendingCurrentPage() < this.pendingTotalPages()) {
      this.pendingCurrentPage.set(this.pendingCurrentPage() + 1);
    }
  }

  previousCompletedPage() {
    if (this.completedCurrentPage() > 1) {
      this.completedCurrentPage.set(this.completedCurrentPage() - 1);
    }
  }

  previousPendingPage() {
    if (this.pendingCurrentPage() > 1) {
      this.pendingCurrentPage.set(this.pendingCurrentPage() - 1);
    }
  }

  refreshData() {
    this.pendingError.set('');
    this.completedError.set('');

    this.loadCompletedTasks(this.completedCurrentPage(), this.completedItemsPerPage());
    this.loadPendingTasks(this.pendingCurrentPage(), this.pendingItemsPerPage());
  }

  isAdmin() {
    return this.auth.isAdmin();
  }

  isSuperAdmin() {
    return this.auth.isSuper();
  }

  getSubtaskProgress(task: Task): string {
    if (!task.subtasks || task.subtasks.length === 0) return '';
    const completed = task.subtasks.filter(s => s.completed).length;
    return `${completed}/${task.subtasks.length} subtasks`;
  }

  getSubtaskProgressPercentage(task: Task): number {
    if (!task.subtasks || task.subtasks.length === 0) return 0;
    const completed = task.subtasks.filter(s => s.completed).length;
    return (completed / task.subtasks.length) * 100;
  }

  toggleTaskStatus(task: Task, completed: boolean) {
    // Optimistic UI update on the raw source signals
    const previousPending = [...this.pendingTasks()];
    const previousCompleted = [...this.completedTasks()];

    if (completed) {
      this.pendingTasks.update(tasks => tasks.filter(t => t._id !== task._id));
      this.completedTasks.update(tasks => [task, ...tasks]);
    } else {
      this.completedTasks.update(tasks => tasks.filter(t => t._id !== task._id));
      this.pendingTasks.update(tasks => [task, ...tasks]);
    }

    this.taskService.updateTask(task._id!, { completed }).subscribe({
      next: () => {
        this.refreshData();
      },
      error: (err) => {
        console.error('Failed to update task status', err);
        this.pendingTasks.set(previousPending);
        this.completedTasks.set(previousCompleted);
        this.refreshData();
      }
    });
  }
}
