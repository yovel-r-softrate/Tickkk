import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { TaskService } from '../../../services/task.service';
import {
  FormBuilder,
  FormArray,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../core/models/user.model';
import { NgClass } from '@angular/common';
import { UsersService } from '../../../services/users.service';
import { NotificationService } from '../../../services/notification.service';
import { AiService } from '../../../services/ai.service';

@Component({
    selector: 'app-task-form',
    imports: [ReactiveFormsModule, NgClass, RouterLink],
    templateUrl: './task-form.component.html',
})
export class TaskFormComponent {
  taskForm!: FormGroup;
  users: User[] = [];
  minDateTime: string = '';
  userSearchQuery = signal<string>('');
  showUserDropdown = signal<boolean>(false);
  
  filteredUsers = computed(() => {
    const query = this.userSearchQuery().toLowerCase().trim();
    if (!query) return []; // Don't show all initially
    return this.users.filter(user => 
      user.name?.toLowerCase().includes(query) || 
      user.email.toLowerCase().includes(query) ||
      user.employeeId?.toLowerCase().includes(query)
    );
  });

  router = inject(Router);
  taskService = inject(TaskService);
  auth = inject(AuthService);
  usersService = inject(UsersService);
  fb = inject(FormBuilder);
  notificationService = inject(NotificationService);
  aiService = inject(AiService);

  loading = signal<boolean>(false);
  error = signal<string>('');
  aiLoading = signal<{ subtasks: boolean; description: boolean; priority: boolean }>({
    subtasks: false, description: false, priority: false
  });

  constructor() {
    this.minDateTime = this.getLocalISOString(new Date());
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(3)]],
      tag: [''],
      deadline: [this.getDefaultDeadline(), Validators.required],
      priority: ['', Validators.required],
      userId: ['', Validators.required],
      subtasks: this.fb.array([])
    });
  }

  getLocalISOString(date: Date): string {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  }

  getDefaultDeadline(): string {
    const now = new Date();
    now.setHours(18, 0, 0, 0);
    if (now.getTime() < Date.now()) {
      now.setDate(now.getDate() + 1);
    }
    return this.getLocalISOString(now);
  }

  get subtasks() {
    return this.taskForm.get('subtasks') as FormArray;
  }

  addSubtask() {
    this.subtasks.push(this.fb.group({
      title: ['', Validators.required],
      completed: [false]
    }));
  }

  removeSubtask(index: number) {
    this.subtasks.removeAt(index);
  }

  onSubtaskPaste(event: ClipboardEvent, index: number) {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const pastedText = clipboardData.getData('text');
    if (!pastedText || !pastedText.includes('\n')) return;

    event.preventDefault();

    const lines = pastedText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length > 0) {
      this.subtasks.at(index).patchValue({ title: lines[0] });

      for (let i = 1; i < lines.length; i++) {
        this.subtasks.insert(index + i, this.fb.group({
          title: [lines[i], Validators.required],
          completed: [false]
        }));
      }
    }
  }

  ngOnInit() {
    this.loadOrganizationUsers();
  }

  onUserSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.userSearchQuery.set(value);
    this.showUserDropdown.set(true);
    
    // Invalidate selection if they edit the query
    const matchedUser = this.users.find(u => (u.name || u.email) === value);
    if (matchedUser) {
      this.taskForm.patchValue({ userId: matchedUser._id });
    } else {
      this.taskForm.patchValue({ userId: '' });
    }
  }

  selectUser(user: any) {
    this.taskForm.patchValue({ userId: user._id });
    this.userSearchQuery.set(user.name || user.email);
    this.showUserDropdown.set(false);
  }

  closeUserDropdownWithDelay() {
    setTimeout(() => {
      this.showUserDropdown.set(false);
    }, 200);
  }

  loadOrganizationUsers() {
    this.loading.set(true);
    this.usersService.getUsers().subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.users = response.data.users || [];
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.error = error?.error?.message || 'Error loading users';
        this.loading.set(false);
      }
    });
  }

  aiSuggestSubtasks() {
    const title = this.taskForm.get('title')?.value;
    if (!title) {
      this.notificationService.warning('Please enter a task title first.', 'AI');
      return;
    }
    const description = this.taskForm.get('description')?.value;
    this.aiLoading.update(s => ({ ...s, subtasks: true }));

    this.aiService.suggestSubtasks(title, description).subscribe({
      next: (response) => {
        const subtasksArray = this.subtasks;
        for (const st of response.data.subtasks) {
          subtasksArray.push(this.fb.group({ title: [st, Validators.required], completed: [false] }));
        }
        this.aiLoading.update(s => ({ ...s, subtasks: false }));
        this.notificationService.success(`Added ${response.data.subtasks.length} AI-suggested subtasks.`, 'AI');
      },
      error: () => {
        this.aiLoading.update(s => ({ ...s, subtasks: false }));
        this.notificationService.error('Failed to get AI suggestions.', 'AI Error');
      }
    });
  }

  aiImproveDescription() {
    const title = this.taskForm.get('title')?.value;
    if (!title) {
      this.notificationService.warning('Please enter a task title first.', 'AI');
      return;
    }
    const description = this.taskForm.get('description')?.value;
    this.aiLoading.update(s => ({ ...s, description: true }));

    this.aiService.improveDescription(title, description).subscribe({
      next: (response) => {
        this.taskForm.patchValue({ description: response.data.description });
        this.aiLoading.update(s => ({ ...s, description: false }));
        this.notificationService.success('Description improved by AI.', 'AI');
      },
      error: () => {
        this.aiLoading.update(s => ({ ...s, description: false }));
        this.notificationService.error('Failed to improve description.', 'AI Error');
      }
    });
  }

  aiSuggestPriority() {
    const title = this.taskForm.get('title')?.value;
    if (!title) {
      this.notificationService.warning('Please enter a task title first.', 'AI');
      return;
    }
    const description = this.taskForm.get('description')?.value;
    const deadline = this.taskForm.get('deadline')?.value;
    this.aiLoading.update(s => ({ ...s, priority: true }));

    this.aiService.suggestPriority(title, description, deadline).subscribe({
      next: (response) => {
        this.taskForm.patchValue({ priority: response.data.priority });
        this.aiLoading.update(s => ({ ...s, priority: false }));
        this.notificationService.info(`AI suggests ${response.data.priority} priority: ${response.data.reason}`, 'AI');
      },
      error: () => {
        this.aiLoading.update(s => ({ ...s, priority: false }));
        this.notificationService.error('Failed to suggest priority.', 'AI Error');
      }
    });
  }

  createTask() {
    if (this.taskForm.invalid || this.loading()) {
      return;
    }
    const task = {
      title: this.taskForm.value.title,
      description: this.taskForm.value.description,
      deadline: this.taskForm.value.deadline,
      priority: this.taskForm.value.priority,
      tag: this.taskForm.value.tag,
      userId: this.taskForm.value.userId,
      subtasks: this.taskForm.value.subtasks
    };

    this.loading.set(true);
    this.taskService.createTask(task).subscribe({
      next: () => {
        this.notificationService.success('Task created successfully! Your team has been notified.', 'Task Created');
        this.router.navigate(['/tasks']);
      },
      error: (error) => {
        console.error('Error creating task:', error);
        this.notificationService.error(error?.error?.message || 'Failed to create task. Please try again.', 'Error');
        this.loading.set(false);
      },
    });
  }
}
