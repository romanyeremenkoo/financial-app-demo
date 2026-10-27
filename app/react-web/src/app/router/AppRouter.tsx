import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { AppShell } from '../../shared/layout/AppShell';
import { Skeleton } from '../../shared/ui/Skeleton';
import { range } from '../../shared/util/collection.util';
import { RequireDemoSession } from './RequireDemoSession';

const DemoEntryPage = lazy(async () => import('../../features/demo-entry/DemoEntryPage'));
const DashboardPage = lazy(async () => import('../../features/dashboard/DashboardPage'));
const AccountsPage = lazy(async () => import('../../features/accounts/AccountsPage'));
const TransactionsPage = lazy(async () => import('../../features/transactions/TransactionsPage'));
const TransfersPage = lazy(async () => import('../../features/transfers/TransfersPage'));
const AnalyticsPage = lazy(async () => import('../../features/analytics/AnalyticsPage'));

const ROUTE_FALLBACK_ROWS = 4;

/** Placeholder shown while a lazily loaded feature chunk is fetched. */
const RouteFallback = () => (
  <div className="fin-page" aria-hidden="true">
    <Skeleton width="220px" height="32px" />
    {range(ROUTE_FALLBACK_ROWS).map((row) => (
      <Skeleton key={row} height="76px" />
    ))}
  </div>
);

/**
 * Two route groups: the public demo entry, and the product area behind the
 * shell. Every feature page is code-split so the initial bundle only carries
 * the shell and the entry screen.
 */
export const AppRouter = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/welcome" element={<DemoEntryPage />} />
      <Route
        element={
          <RequireDemoSession>
            <AppShell />
          </RequireDemoSession>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/transfers" element={<TransfersPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>
  </Suspense>
);
