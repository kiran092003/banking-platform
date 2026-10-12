import { apiClient } from './axios';
import type {
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
