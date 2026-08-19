import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'tasks',
    loadComponent: () =>
      import('./components/tasks/task-list/task-list.component').then(
        (m) => m.TaskListComponent
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'tasks/new',
    loadComponent: () =>
      import('./components/tasks/task-form/task-form.component').then(
        (m) => m.TaskFormComponent
      ),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: 'tasks/:id',
    loadComponent: () =>
      import('./components/tasks/task-detail/task-detail.component').then(
        (m) => m.TaskDetailComponent
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'tasks/edit/:id',
    loadComponent: () =>
      import('./components/tasks/task-edit/task-edit.component').then(
        (m) => m.TaskEditComponent
      ),
    canActivate: [AuthGuard],
  },

  {
    path: 'profile',
    loadComponent: () =>
      import('./components/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'privacy-policy',
    loadComponent: () =>
      import('./components/privacy-policy/privacy-policy.component').then(
        (m) => m.PrivacyPolicyComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

