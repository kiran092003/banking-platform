/**
 * Mirrors account-service DTOs exactly.
 * Source: http://localhost:8080/swagger/account-api-docs
 */

export type AccountType = 'SAVINGS' | 'CURRENT';
export type AccountStatus = 'ACTIVE' | 'BLOCKED' | 'CLOSED';

/** AccountResponseDTO */
export interface Account {
  id: number;
  accountNumber: string;
  userId: number;
  accountType: AccountType;
  balance: number;
  status: AccountStatus;
  createdAt: string;
}

/** POST /account/accounts request — AccountRequestDTO */
export interface CreateAccountRequest {
  userId: number;
  accountType: AccountType;
}

/** PUT /account/accounts/{id} request — AccountUpdateRequestDTO */
export interface UpdateAccountRequest {
  accountType: AccountType;
}
