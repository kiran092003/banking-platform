import { apiClient } from './axios';
import type {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RegisterRequest,
  RegisterResponse,
} from '@/types/auth';

/**
 * Auth Service via the API Gateway.
 * Gateway strips the `/auth` prefix: /auth/login -> auth-service /login.
 */

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
  return data;
}

export async function register(payload: RegisterRequest): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>('/auth/register', payload);
  return data;
}

export async function refresh(payload: RefreshTokenRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/refresh', payload);
  return data;
}

/** Revokes the refresh token server-side. Returns plain text, not JSON. */
export async function logout(payload: RefreshTokenRequest): Promise<void> {
  await apiClient.post('/auth/logout', payload);
}

/**
 * POST /auth/password — changes the signed-in user's own password.
 *
 * Authenticated, so the axios interceptor attaches the bearer token as usual.
 * A wrong current password comes back as a 400, deliberately not a 401: a 401
 * here would send the interceptor off to refresh and replay the request.
 *
 * On success the backend revokes the refresh token, so the caller must treat
 * the session as over — see `useChangePassword`.
 */
export async function changePassword(payload: ChangePasswordRequest): Promise<void> {
  await apiClient.post('/auth/password', payload, {
    loading: { blocking: true, message: 'Changing password…' },
  });
}
