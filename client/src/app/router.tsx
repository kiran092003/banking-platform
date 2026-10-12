import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import {
  ProtectedRoute,
  PublicOnlyRoute,
  RoleRoute,
} from '@/components/common/RouteGuards';
import { RootLayout } from './RootLayout';

/*
 * Routes are code-split so the sign-in screen does not ship the admin area,
 * the transfer flow or the data tables.
 */
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const AccountsPage = lazy(() => import('@/pages/accounts/AccountsPage'));
const AccountDetailsPage = lazy(() => import('@/pages/accounts/AccountDetailsPage'));
const CreateAccountPage = lazy(() => import('@/pages/accounts/CreateAccountPage'));
const TransferPage = lazy(() => import('@/pages/transfer/TransferPage'));
const TransactionsPage = lazy(() => import('@/pages/transactions/TransactionsPage'));
const TransactionDetailsPage = lazy(
  () => import('@/pages/transactions/TransactionDetailsPage')
);
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminTransactionsPage = lazy(() => import('@/pages/admin/AdminTransactionsPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const SystemActivityPage = lazy(() => import('@/pages/admin/SystemActivityPage'));

const UnauthorizedPage = lazy(() =>
  import('@/pages/errors/ErrorPage').then((m) => ({ default: m.UnauthorizedPage }))
);
const ForbiddenPage = lazy(() =>
  import('@/pages/errors/ErrorPage').then((m) => ({ default: m.ForbiddenPage }))
);
const NotFoundPage = lazy(() =>
  import('@/pages/errors/ErrorPage').then((m) => ({ default: m.NotFoundPage }))
);
const ServiceUnavailablePage = lazy(() =>
  import('@/pages/errors/ErrorPage').then((m) => ({ default: m.ServiceUnavailablePage }))
);

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Public
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },

      // Authenticated application
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              { path: '/dashboard', element: <DashboardPage /> },

              { path: '/accounts', element: <AccountsPage /> },
              // Must precede the :accountId route so "new" is not read as an id.
              {
                element: <RoleRoute allowedRoles={['ADMIN']} />,
                children: [{ path: '/accounts/new', element: <CreateAccountPage /> }],
              },
              { path: '/accounts/:accountId', element: <AccountDetailsPage /> },

              { path: '/transfer', element: <TransferPage /> },
              { path: '/transactions', element: <TransactionsPage /> },
              { path: '/transactions/:transactionId', element: <TransactionDetailsPage /> },
              { path: '/notifications', element: <NotificationsPage /> },
              { path: '/settings', element: <SettingsPage /> },

              // Admin — guarded by role, not merely hidden from the nav.
              {
                element: <RoleRoute allowedRoles={['ADMIN']} />,
                children: [
                  { path: '/admin', element: <AdminDashboardPage /> },
                  { path: '/admin/accounts', element: <AccountsPage /> },
                  { path: '/admin/transactions', element: <AdminTransactionsPage /> },
                  { path: '/admin/users', element: <AdminUsersPage /> },
                  { path: '/admin/activity', element: <SystemActivityPage /> },
                ],
              },
            ],
          },
        ],
      },

      // Error pages
      { path: '/401', element: <UnauthorizedPage /> },
      { path: '/403', element: <ForbiddenPage /> },
      { path: '/503', element: <ServiceUnavailablePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
