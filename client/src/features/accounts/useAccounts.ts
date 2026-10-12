import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as accountApi from '@/api/accountApi';
import { queryKeys } from '@/api/queryKeys';
import type { CreateAccountRequest, UpdateAccountRequest } from '@/types/account';
import { useAuth } from '@/features/auth/useAuth';

/** GET /account/accounts — ADMIN only. */
export function useAccounts() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: queryKeys.accounts.list(),
    queryFn: accountApi.getAllAccounts,
    // Pointless to fire for a non-admin: the backend rejects it.
    enabled: isAdmin,
  });
}

/** GET /account/accounts/{id} — ADMIN only. */
export function useAccount(id: number | undefined) {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: queryKeys.accounts.detail(id ?? 0),
    queryFn: () => accountApi.getAccountById(id as number),
    enabled: isAdmin && typeof id === 'number' && id > 0,
  });
}

/** GET /account/accounts/me — the signed-in user's own account, any role. */
export function useMyAccount() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.accounts.mine(),
    queryFn: accountApi.getMyAccount,
    enabled: isAuthenticated,
    // A user without an account yet gets a 404; retrying will not help.
    retry: false,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAccountRequest) => accountApi.createAccount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateAccountRequest }) =>
      accountApi.updateAccount(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
}

export function useCloseAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => accountApi.closeAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
}
