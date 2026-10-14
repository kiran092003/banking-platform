import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import * as authApi from '@/api/authApi';
import type {
  ChangePasswordRequest,
  LoginFormSubmission,
  RegisterRequest,
} from '@/types/auth';
import { credentialsReceived, loggedOut } from './authSlice';
import { getRefreshToken } from './tokenStorage';

/** Current session, derived from the access token's claims. */
export function useAuth() {
  const { user, accessToken, isInitialized } = useAppSelector((state) => state.auth);

  return {
    user,
    isAuthenticated: Boolean(user && accessToken),
    isAdmin: user?.role === 'ADMIN',
    isInitialized,
  };
}

export function useLogin() {
  const dispatch = useAppDispatch();

  return useMutation({
    // `remember` is stripped before the request: it decides which web storage
    // holds the tokens and means nothing to the backend.
    mutationFn: ({ remember: _remember, ...credentials }: LoginFormSubmission) =>
      authApi.login(credentials),
    onSuccess: (data, variables) => {
      dispatch(credentialsReceived({ ...data, remember: variables.remember }));
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterRequest) => authApi.register(payload),
  });
}

/**
 * Changes the signed-in user's own password.
 *
 * A successful change revokes the refresh token server-side, so the session is
 * over whether or not the UI acts on it: the access token would keep working
 * for up to 15 minutes and then fail to refresh, signing the user out at a
 * moment unconnected to anything they did. Clearing the session here instead
 * makes that immediate and explicable, and the caller routes to /login with a
 * message saying why.
 */
export function useChangePassword() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ChangePasswordRequest) => authApi.changePassword(payload),
    onSuccess: () => {
      dispatch(loggedOut());
      queryClient.clear();
    },
  });
}

export function useLogout() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const refreshToken = getRefreshToken();
      // Revoke server-side so the refresh token cannot be replayed. A failure
      // here must not strand the user in a signed-in UI, so it is swallowed.
      if (refreshToken) {
        try {
          await authApi.logout({ refreshToken });
        } catch {
          // Already expired or revoked — the local sign-out below still applies.
        }
      }
    },
    onSettled: () => {
      dispatch(loggedOut());
      // Drop every cached server response so the next user starts clean.
      queryClient.clear();
    },
  });
}
