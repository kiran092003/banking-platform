import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from '@/app/hooks';
import { loggedOut } from '@/features/auth/authSlice';
import { SESSION_EXPIRED_EVENT } from '@/features/auth/tokenStorage';

/**
 * Bridges the Axios interceptor to React.
 *
 * The interceptor cannot dispatch or navigate on its own, so when a refresh
 * fails it emits an event; this clears auth state, drops cached server data and
 * routes to /login.
 */
export function SessionExpiryListener() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    function onSessionExpired() {
      dispatch(loggedOut());
      queryClient.clear();
      navigate('/login', { replace: true, state: { sessionExpired: true } });
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [dispatch, navigate, queryClient]);

  return null;
}
