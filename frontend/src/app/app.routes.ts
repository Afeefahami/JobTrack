import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'JobTrack — Your Career, Organized.',
    loadComponent: () => import('./features/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'login',
    title: 'Sign in · JobTrack',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    title: 'Create account · JobTrack',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'forgot-password',
    title: 'Reset password · JobTrack',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    title: 'Choose a new password · JobTrack',
    loadComponent: () =>
      import('./features/auth/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        title: 'Dashboard · JobTrack',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'applications',
        title: 'Applications · JobTrack',
        loadComponent: () =>
          import('./features/applications/application-list.component').then((m) => m.ApplicationListComponent),
      },
      {
        // "new" must come before ":id" so it is not read as an application id.
        path: 'applications/new',
        title: 'Add application · JobTrack',
        loadComponent: () =>
          import('./features/applications/application-form.component').then((m) => m.ApplicationFormComponent),
      },
      {
        path: 'applications/:id/edit',
        title: 'Edit application · JobTrack',
        loadComponent: () =>
          import('./features/applications/application-form.component').then((m) => m.ApplicationFormComponent),
      },
      {
        path: 'applications/:id',
        title: 'Application · JobTrack',
        loadComponent: () =>
          import('./features/applications/application-detail.component').then((m) => m.ApplicationDetailComponent),
      },
      {
        path: 'timeline',
        title: 'Timeline · JobTrack',
        loadComponent: () => import('./features/timeline/timeline-page.component').then((m) => m.TimelinePageComponent),
      },
      {
        path: 'reminders',
        title: 'Reminders · JobTrack',
        loadComponent: () =>
          import('./features/reminders/reminders-page.component').then((m) => m.RemindersPageComponent),
      },
      {
        path: 'job-search',
        title: 'Job Search · JobTrack',
        loadComponent: () => import('./features/job-search/job-search.component').then((m) => m.JobSearchComponent),
      },
      {
        path: 'settings',
        title: 'Settings · JobTrack',
        loadComponent: () => import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
