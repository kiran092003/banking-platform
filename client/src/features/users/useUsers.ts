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
