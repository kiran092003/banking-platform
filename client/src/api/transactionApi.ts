import { apiClient } from './axios';
import {
  MAX_PAGE_SIZE,
  type CreateTransactionRequest,
  type Transaction,
  type TransactionHistoryParams,
  type TransactionHistoryResponse,
} from '@/types/transaction';

/**
 * Transaction Service via the API Gateway.
 * Gateway strips the `/transaction` prefix.
 *
 * Authorisation: authenticated — any role. History is scoped server-side to the
 * JWT's `userId`, so there is no userId parameter and no way to read another
 * user's transactions (this applies to ADMIN too).
 */

/** GET /transaction/transactions */
export async function getTransactionHistory(
  params: TransactionHistoryParams = {}
): Promise<TransactionHistoryResponse> {
  const { data } = await apiClient.get<TransactionHistoryResponse>(
    '/transaction/transactions',
    {
      params: {
        page: params.page ?? 0,
        // Backend rejects anything above 50 with a 400.
        size: Math.min(params.size ?? 10, MAX_PAGE_SIZE),
        status: params.status,
        transactionType: params.transactionType,
        from: params.from,
        to: params.to,
        sortBy: params.sortBy ?? 'createdAt',
        direction: params.direction ?? 'DESC',
      },
    }
  );
  return data;
}

/** GET /transaction/transactions/{transactionId} */
export async function getTransactionById(transactionId: number): Promise<Transaction> {
  const { data } = await apiClient.get<Transaction>(
    `/transaction/transactions/${transactionId}`
  );
  return data;
}

/**
 * POST /transaction/transactions
 *
 * Null-vs-omitted matters here: the backend rejects a DEPOSIT that carries a
 * senderAccountId and a WITHDRAWAL that carries a receiverAccountId, so the
 * unused side is sent as an explicit null.
 */
export async function createTransaction(
  payload: CreateTransactionRequest
): Promise<Transaction> {
  const { data } = await apiClient.post<Transaction>(
    '/transaction/transactions',
    {
      senderAccountId: payload.senderAccountId ?? null,
      receiverAccountId: payload.receiverAccountId ?? null,
      amount: payload.amount,
      transactionType: payload.transactionType,
      idempotencyKey: payload.idempotencyKey,
    },
    // Blocking: this moves money. The idempotency key makes a duplicate
    // harmless, but the user should not be able to click twice and then wonder
    // which of the two went through.
    { loading: { blocking: true, message: 'Submitting transaction…' } }
  );
  return data;
}
