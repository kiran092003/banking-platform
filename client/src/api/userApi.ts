import { apiClient } from './axios';
import {
  MAX_USER_PAGE_SIZE,
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
