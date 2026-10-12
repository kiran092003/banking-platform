import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import * as authApi from '@/api/authApi';
import type { LoginRequest, RegisterRequest } from '@/types/auth';
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
    mutationFn: (payload: LoginRequest) => authApi.login(payload),
    onSuccess: (data) => {
      dispatch(credentialsReceived(data));
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterRequest) => authApi.register(payload),
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
