import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as userApi from '@/api/userApi';
import { queryKeys } from '@/api/queryKeys';
import { useAuth } from '@/features/auth/useAuth';
import type { Role } from '@/types/auth';
import type { UserQueryParams } from '@/types/user';

/** GET /auth/users — ADMIN only. */
export function useUsers(params: UserQueryParams) {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => userApi.getUsers(params),
    // Pointless to fire for a non-admin: the backend rejects it with a 403.
    enabled: isAdmin,
    // Keeps the current page on screen while the next one loads.
    placeholderData: (previous) => previous,
  });
}

/**
 * Every user, keyed by id, for the name pickers that replaced the raw numeric
 * ID fields. Separate from `useUsers` so paging through the admin table never
 * evicts the picker's data, and vice versa.
 */
export function useUserDirectory() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: queryKeys.users.directory(),
    queryFn: userApi.getAllUsers,
    // Pointless to fire for a non-admin: the backend rejects it with a 403.
    enabled: isAdmin,
    // The directory changes far less often than a balance does.
    staleTime: 60_000,
  });
}

/**
 * PATCH /auth/users/{userId}/role
 *
 * Invalidates the directory so the new role shows immediately. It does not
 * touch the caller's own session: an admin cannot change their own role, so
 * their token and claims are never affected by this call.
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: Role }) =>
      userApi.updateUserRole(userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

/**
 * PATCH /auth/users/{userId}/password
 *
 * Nothing in the directory listing changes — a password is not part of
 * UserSummary — so there is no invalidation to do. It cannot affect the
 * caller's own session either: the backend refuses an admin resetting their
 * own password, which is what the change-password form is for.
 */
export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ userId, newPassword }: { userId: number; newPassword: string }) =>
      userApi.resetUserPassword(userId, { newPassword }),
  });
}
