import { Routes } from '@angular/router';
import { demoSessionGuard } from './core/services/demo-session.guard';

/**
 * Two route groups: the public demo entry, and the product area behind the
 * shell. Every feature page is lazy-loaded so the initial bundle only carries
 * the shell and the entry screen.
 *
 * `title` holds a translation key, resolved by `TranslatedTitleStrategy`.
 */
export const routes: Routes = [
  {
    path: 'welcome',
    title: 'documentTitle.welcome',
    loadComponent: () =>
      import('./features/demo-entry/demo-entry.page').then((m) => m.DemoEntryPage),
  },
  {
    path: '',
    canActivate: [demoSessionGuard],
    loadComponent: () =>
      import('./core/layout/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'dashboard',
        title: 'documentTitle.dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'accounts',
        title: 'documentTitle.accounts',
        loadComponent: () =>
          import('./features/accounts/accounts.page').then((m) => m.AccountsPage),
      },
      {
        path: 'transactions',
        title: 'documentTitle.transactions',
        loadComponent: () =>
          import('./features/transactions/transactions.page').then((m) => m.TransactionsPage),
      },
      {
        path: 'transfers',
        title: 'documentTitle.transfers',
        loadComponent: () =>
          import('./features/transfers/transfers.page').then((m) => m.TransfersPage),
      },
      {
        path: 'analytics',
        title: 'documentTitle.analytics',
        loadComponent: () =>
          import('./features/analytics/analytics.page').then((m) => m.AnalyticsPage),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'welcome' },
];
