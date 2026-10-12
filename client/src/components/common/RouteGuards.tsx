import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import type { Role } from '@/types/auth';

/**
 * Requires a session. Remembers where the user was heading so sign-in can
 * return them there.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isInitialized } = useAuth();
  const location = useLocation();

  if (!isInitialized) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

/**
 * Requires one of `allowedRoles`.
 *
 * This checks the authenticated user's role rather than relying on the nav
 * hiding a link — typing /admin directly lands on 403. It is still only a UX
 * guard: every admin endpoint is authorised server-side, so a forged role claim
 * gets a rejection from the backend, not data.
 */
export function RoleRoute({ allowedRoles }: { allowedRoles: Role[] }) {
  const { user, isAuthenticated, isInitialized } = useAuth();
  const location = useLocation();

  if (!isInitialized) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}

/** Keeps a signed-in user away from /login and /register. */
export function PublicOnlyRoute() {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
