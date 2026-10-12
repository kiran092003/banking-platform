import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as transactionApi from '@/api/transactionApi';
import { queryKeys } from '@/api/queryKeys';
import type {
  CreateTransactionRequest,
  TransactionHistoryParams,
} from '@/types/transaction';
import { useAuth } from '@/features/auth/useAuth';

/** GET /transaction/transactions — scoped server-side to the caller. */
export function useTransactions(params: TransactionHistoryParams) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.transactions.list(params),
    queryFn: () => transactionApi.getTransactionHistory(params),
    enabled: isAuthenticated,
    // Keeps the previous page on screen while the next one loads.
    placeholderData: (previous) => previous,
  });
}

/** GET /transaction/transactions/{id} */
export function useTransaction(id: number | undefined) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.transactions.detail(id ?? 0),
    queryFn: () => transactionApi.getTransactionById(id as number),
    enabled: isAuthenticated && typeof id === 'number' && id > 0,
    retry: false,
  });
}

/**
 * POST /transaction/transactions
 *
 * A transaction moves money, so on success we invalidate both transactions and
 * accounts: the balance on the account queries is now stale, and the dashboard
 * reads from both.
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTransactionRequest) =>
      transactionApi.createTransaction(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
}
