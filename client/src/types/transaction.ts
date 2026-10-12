/**
 * Mirrors transaction-service DTOs exactly.
 * Source: http://localhost:8080/swagger/transaction-api-docs
 */

export type TransactionType = 'TRANSFER' | 'DEPOSIT' | 'WITHDRAWAL';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

/** TransactionResponse */
export interface Transaction {
  id: number;
  userId: number;
  senderAccountId: number | null;
  receiverAccountId: number | null;
  amount: number;
  transactionType: TransactionType;
  status: TransactionStatus;
  failureReason: string | null;
  createdAt: string;
  idempotencyKey: string;
}

/**
 * POST /transaction/transactions request — CreateTransactionRequest.
 *
 * Verified backend rules (TransactionService.validateTransaction /
 * validateAccountOwnership):
 *   TRANSFER   → senderAccountId = your own account, receiverAccountId required and different
 *   DEPOSIT    → receiverAccountId = your own account, senderAccountId MUST be null
 *   WITHDRAWAL → senderAccountId = your own account, receiverAccountId MUST be null
 */
export interface CreateTransactionRequest {
  senderAccountId?: number | null;
  receiverAccountId?: number | null;
  amount: number;
  transactionType: TransactionType;
  idempotencyKey: string;
}

/** TransactionHistoryResponse */
export interface TransactionHistoryResponse {
  transactions: Transaction[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/** Sort fields the backend whitelists; anything else is rejected with 400. */
export type TransactionSortField =
  | 'id'
  | 'amount'
  | 'createdAt'
  | 'status'
  | 'transactionType';

export type SortDirection = 'ASC' | 'DESC';

/** Query params accepted by GET /transaction/transactions. */
export interface TransactionHistoryParams {
  page?: number;
  /** Backend hard-caps this at 50. */
  size?: number;
  status?: TransactionStatus;
  transactionType?: TransactionType;
  from?: string;
  to?: string;
  sortBy?: TransactionSortField;
  direction?: SortDirection;
}

/** Backend rejects size > 50 with 400 INVALID_TRANSACTION. */
export const MAX_PAGE_SIZE = 50;
