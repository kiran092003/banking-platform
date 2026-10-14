/**
 * Mirrors auth-service user-administration DTOs exactly.
 * Source: UserAdminController / UserSummaryDto / UserPageResponseDto.
 */

import type { Role } from './auth';

/** UserSummaryDto. Carries no password hash — the backend never sends one. */
export interface UserSummary {
  id: number;
  username: string;
  email: string;
  role: Role;
}

/** GET /auth/users query parameters. */
export interface UserQueryParams {
  page?: number;
  size?: number;
  /** Free-text match across username and email. */
  search?: string;
  role?: Role;
}

/** GET /auth/users response — UserPageResponseDto. */
export interface UserPageResponse {
  users: UserSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/** PATCH /auth/users/{userId}/role request — UpdateRoleDto. */
/**
 * PATCH /auth/users/{userId}/password request — ResetPasswordDto.
 *
 * No current password: the endpoint exists to recover an account whose
 * password nobody knows. Authorisation is the caller's ADMIN role.
 */
export interface ResetPasswordRequest {
  newPassword: string;
}

export interface UpdateRoleRequest {
  role: Role;
}

/** UserAdminService caps the page size server-side. */
export const MAX_USER_PAGE_SIZE = 50;

export const ASSIGNABLE_ROLES: Role[] = ['USER', 'ADMIN', 'SUPPORT'];
