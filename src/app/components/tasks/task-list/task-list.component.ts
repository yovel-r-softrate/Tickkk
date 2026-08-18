import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
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

  completedPaginatedTasks = signal<Task[]>([]);
  pendingPaginatedTasks = signal<Task[]>([]);

  activeTab = signal<'ongoing' | 'completed'>('ongoing');

  completedCurrentPage = signal<number>(1);
  pendingCurrentPage = signal<number>(1);

  completedItemsPerPage = signal<number>(10);
  pendingItemsPerPage = signal<number>(10);

  completedTotalPages = signal<number>(0);
  pendingTotalPages = signal<number>(0);

  // Column search filters
  titleSearch = signal<string>('');
  descriptionSearch = signal<string>('');
  prioritySearch = signal<string>('');

  completedTotalTasks = signal<number>(0); // Add signal for total completed tasks
  pendingTotalTasks = signal<number>(0);   // Add signal for total pending tasks

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
    this.completedLoading.set(true);
    this.taskService.getCompletedTasks(
      page, 
      limit, 
      this.searchQuery(), 
      this.prioritySearch() || this.priorityFilter(), 
      this.titleSearch(), 
      this.descriptionSearch()
    ).subscribe({
      next: (response) => {
        if (response.status === 'success' && response.data) {
          // Set the tasks directly from the response
          this.completedTasks.set(response.data.tasks || []);
          this.completedTotalPages.set(response.data.totalPages || 1);
          this.completedCurrentPage.set(response.data.currentPage || 1);
          this.completedTotalTasks.set(response.data.totalTasks || 0);

          // No need to call updateCompletedPaginatedTasks() here
          // as we're directly using the paginated data from the API
          this.completedPaginatedTasks.set(response.data.tasks || []);
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
    this.pendingLoading.set(true);
    this.taskService.getPendingTasks(
      page, 
      limit, 
      this.searchQuery(), 
      this.prioritySearch() || this.priorityFilter(), 
      this.sortBy(), 
      this.sortOrder(),
      this.titleSearch(),
      this.descriptionSearch()
    ).subscribe({
      next: (response) => {
        if (response.status === 'success' && response.data) {
          this.pendingTasks.set(response.data.tasks || []);
          this.pendingTotalPages.set(response.data.totalPages || 1);
          this.pendingCurrentPage.set(response.data.currentPage || 1);
          this.pendingTotalTasks.set(response.data.totalTasks || 0);

          // Directly set the paginated tasks from the API response
          this.pendingPaginatedTasks.set(response.data.tasks || []);
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
    // This method is redundant if we use loadPendingTasks for all organizational tasks
    // But keeping it consistent if specific "My Tasks" view is needed
    this.loadPendingTasks(page, limit);
  }

  onFilterChange() {
    this.pendingCurrentPage.set(1);
    this.completedCurrentPage.set(1);
    this.refreshData();
  }

  onSearchChange() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.onFilterChange();
    }, 400); // 400ms debounce
  }

  toggleSortOrder() {
    this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    this.onFilterChange();
  }

  // These methods are not currently needed since we're using server-side pagination
  // but kept for potential client-side pagination fallback
  updateCompletedPaginatedTasks() {
    const startIndex =
      (this.completedCurrentPage() - 1) * this.completedItemsPerPage();
    const endIndex = startIndex + this.completedItemsPerPage();
    // Update to use the renamed signal
    this.completedPaginatedTasks.set(
      this.completedTasks().slice(startIndex, endIndex)
    );
  }

  updatePendingPaginatedTasks() {
    const startIndex =
      (this.pendingCurrentPage() - 1) * this.pendingItemsPerPage();
    const endIndex = startIndex + this.pendingItemsPerPage();
    this.pendingPaginatedTasks.set(
      this.pendingTasks().slice(startIndex, endIndex)
    );
  }

  nextCompletedPage() {
    if (this.completedCurrentPage() < this.completedTotalPages()) {
      this.completedCurrentPage.set(this.completedCurrentPage() + 1);
      this.loadCompletedTasks(
        this.completedCurrentPage(),
        this.completedItemsPerPage()
      );
    } else {
      console.log('No more pages to display.');
    }
  }

  nextPendingPage() {
    if (this.pendingCurrentPage() < this.pendingTotalPages()) {
      this.pendingCurrentPage.set(this.pendingCurrentPage() + 1);
      this.loadPendingTasks(
        this.pendingCurrentPage(),
        this.pendingItemsPerPage()
      );
    } else {
      console.log('No more pages to display.');
    }
  }

  previousCompletedPage() {
    if (this.completedCurrentPage() > 1) {
      this.completedCurrentPage.set(this.completedCurrentPage() - 1);
      this.loadCompletedTasks(
        this.completedCurrentPage(),
        this.completedItemsPerPage()
      );
    } else {
      console.log('Already on the first page.');
    }
  }

  previousPendingPage() {
    if (this.pendingCurrentPage() > 1) {
      this.pendingCurrentPage.set(this.pendingCurrentPage() - 1);
      this.loadPendingTasks(
        this.pendingCurrentPage(),
        this.pendingItemsPerPage()
      );
    } else {
      console.log('Already on the first page.');
    }
  }

  refreshData() {
    this.pendingLoading.set(true);
    this.completedLoading.set(true);
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
    // Optimistic UI update
    const previousPending = [...this.pendingPaginatedTasks()];
    const previousCompleted = [...this.completedPaginatedTasks()];

    if (completed) {
      this.pendingPaginatedTasks.set(previousPending.filter(t => t._id !== task._id));
      this.completedPaginatedTasks.update(tasks => [task, ...tasks]);
    } else {
      this.completedPaginatedTasks.set(previousCompleted.filter(t => t._id !== task._id));
      this.pendingPaginatedTasks.update(tasks => [task, ...tasks]);
    }

    this.taskService.updateTask(task._id!, { completed }).subscribe({
      next: () => {
        this.refreshData();
      },
      error: (err) => {
        console.error('Failed to update task status', err);
        this.pendingPaginatedTasks.set(previousPending);
        this.completedPaginatedTasks.set(previousCompleted);
        this.refreshData();
      }
    });
  }
}
