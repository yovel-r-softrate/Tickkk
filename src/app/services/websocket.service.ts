import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket!: Socket;
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  private taskCreatedSource = new Subject<any>();
  private taskUpdatedSource = new Subject<any>();
  private taskDeletedSource = new Subject<string>();

  taskCreated$ = this.taskCreatedSource.asObservable();
  taskUpdated$ = this.taskUpdatedSource.asObservable();
  taskDeleted$ = this.taskDeletedSource.asObservable();

  constructor() {}

  connect() {
    const token = this.authService.getToken();
    if (!token) return;

    if (this.socket && this.socket.connected) {
      return; // Already connected
    }

    // Remove /api from apiUrl to get base URL for socket connection
    const socketUrl = environment.apiUrl.replace(/\/api$/, '');

    this.socket = io(socketUrl, {
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      
      const user = this.authService.getCurrentUser();
      const orgId = user?.organization?.id || null;
      
      this.socket.emit('joinRoom', { orgId });
    });

    this.socket.on('taskCreated', (task) => {
      console.log('Received taskCreated event via socket:', task);
      this.taskCreatedSource.next(task);
      
      const currentUserId = this.authService.getCurrentUserId();
      // Backend sends explicit assignedUserId, fallback to user field
      const assignedUserId = task.assignedUserId || task.user?._id?.toString() || task.user?.toString();

      console.log('Comparing - currentUserId:', currentUserId, '| assignedUserId:', assignedUserId);

      if (currentUserId && assignedUserId && assignedUserId === currentUserId) {
        console.log('Task assigned to current user, showing notification');
        this.notificationService.info(`Task assigned to you: ${task.title}`, 'Task Assigned');
        this.showBrowserNotification('Task Assigned To You', `Task: ${task.title}`);
      } else {
        console.log('Task not assigned to current user, skipping notification');
      }
    });

    this.socket.on('taskUpdated', (task) => {
      this.taskUpdatedSource.next(task);
      
      const currentUserId = this.authService.getCurrentUserId();
      const assignedUserId = task.user?._id || task.user;

      if (assignedUserId === currentUserId) {
        this.notificationService.info(`Your task was updated: ${task.title}`, 'Task Updated');
      }
    });

    this.socket.on('taskDeleted', (taskId) => {
      this.taskDeletedSource.next(taskId);
      // We don't have the full task object here, so we can't check who it belonged to.
      // We'll skip the notification for deletions to avoid spamming the organization.
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
  
  public requestNotificationPermission() {
    if ('Notification' in window) {
      console.log('Current Notification.permission:', Notification.permission);
      if (Notification.permission === 'denied') {
        console.warn('Notification permission was DENIED. User must manually allow it in browser settings.');
        return;
      }
      if (Notification.permission !== 'granted') {
        Notification.requestPermission().then(result => {
          console.log('Permission result:', result);
        });
      } else {
        console.log('Notification permission already granted');
      }
    } else {
      console.warn('Notifications not supported in this browser');
    }
  }

  private showBrowserNotification(title: string, body: string) {
    console.log('showBrowserNotification called. Notification.permission:', Notification.permission);
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const n = new Notification(title, {
          body,
          icon: '/android-chrome-192x192.png'
        });
        console.log('Browser notification sent!', n);
      } else {
        console.warn('Cannot show notification. Permission:', Notification.permission);
      }
    } catch (err) {
      console.error('Failed to show browser notification:', err);
    }
  }
}
