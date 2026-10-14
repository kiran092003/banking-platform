import { apiClient } from './axios';
import {
  MAX_USER_PAGE_SIZE,
  type ResetPasswordRequest,
  type UpdateRoleRequest,
  type UserPageResponse,
  type UserQueryParams,
  type UserSummary,
} from '@/types/user';

/**
 * User administration via the API Gateway.
 * Gateway strips the `/auth` prefix: /auth/users -> auth-service /users.
 *
 * Authorisation: every endpoint here is ADMIN-only, enforced by the
 * class-level @PreAuthorize("hasRole('ADMIN')") on UserAdminController. These
 * are not public auth routes, so the axios interceptor attaches the bearer
 * token and refreshes it on a 401 as usual.
 */

/** GET /auth/users — ADMIN only. Paginated, size capped at 50. */
export async function getUsers(
  params: UserQueryParams = {}
): Promise<UserPageResponse> {
  const search = params.search?.trim();

  const { data } = await apiClient.get<UserPageResponse>('/auth/users', {
    params: {
      page: params.page ?? 0,
      size: Math.min(params.size ?? 20, MAX_USER_PAGE_SIZE),
      // Omitted rather than sent blank so the backend applies no filter.
      search: search ? search : undefined,
      role: params.role,
    },
  });

  return data;
}

/**
 * Every user, for the name pickers on the create-account and transfer screens.
 *
 * There is no "list all" endpoint — GET /auth/users is paginated and the
 * backend caps `size` at 50 — so this walks the pages. The cap below bounds it:
 * it is a picker, not a bulk export, and a directory larger than this needs a
 * searchable combobox rather than a longer <select>.
 */
const MAX_DIRECTORY_PAGES = 20;

export async function getAllUsers(): Promise<UserSummary[]> {
  const collected: UserSummary[] = [];

  for (let page = 0; page < MAX_DIRECTORY_PAGES; page += 1) {
    const response = await getUsers({ page, size: MAX_USER_PAGE_SIZE });

    collected.push(...response.users);

    if (response.last || response.users.length === 0) break;
  }

  return collected;
}

/**
 * PATCH /auth/users/{userId}/role — ADMIN only.
 *
 * The only way to grant ADMIN: registration always creates a USER. The backend
 * rejects changing your own role and demoting the last admin with a 409.
 */
export async function updateUserRole(
  userId: number,
  payload: UpdateRoleRequest
): Promise<UserSummary> {
  const { data } = await apiClient.patch<UserSummary>(
    `/auth/users/${userId}/role`,
    payload,
    // Blocking: granting ADMIN is the most privileged action on the platform.
    { loading: { blocking: true, message: 'Updating role…' } }
  );
  return data;
}

/**
 * PATCH /auth/users/{userId}/password — ADMIN only.
 *
 * Account recovery for a forgotten password: the platform has no email
 * channel, so a reset is an administrative act rather than a self-service
 * link. The backend revokes the target's refresh token, so their existing
 * session ends, and refuses with a 400 if an admin targets their own account.
 */
export async function resetUserPassword(
  userId: number,
  payload: ResetPasswordRequest
): Promise<UserSummary> {
  const { data } = await apiClient.patch<UserSummary>(
    `/auth/users/${userId}/password`,
    payload,
    // Blocking: it takes over another account's credentials.
    { loading: { blocking: true, message: 'Resetting password…' } }
  );
  return data;
}
