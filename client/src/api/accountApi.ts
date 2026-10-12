import { apiClient } from './axios';
import type { Account, CreateAccountRequest, UpdateAccountRequest } from '@/types/account';

/**
 * Account Service via the API Gateway.
 * Gateway strips the `/account` prefix: /account/accounts -> account-service /accounts.
 *
 * Authorisation, verified against AccountController:
 *   every endpoint below carries a class-level @PreAuthorize("hasRole('ADMIN')")
 *   EXCEPT `getMyAccount`, which resolves the account from the caller's own JWT.
 */

/** GET /account/accounts — ADMIN only. Returns a plain array, no pagination. */
export async function getAllAccounts(): Promise<Account[]> {
  const { data } = await apiClient.get<Account[]>('/account/accounts');
  return data;
}

/** GET /account/accounts/{id} — ADMIN only. */
export async function getAccountById(id: number): Promise<Account> {
  const { data } = await apiClient.get<Account>(`/account/accounts/${id}`);
  return data;
}

/** GET /account/accounts/number/{accountNumber} — ADMIN only. 12 digits exactly. */
export async function getAccountByNumber(accountNumber: string): Promise<Account> {
  const { data } = await apiClient.get<Account>(
    `/account/accounts/number/${accountNumber}`
  );
  return data;
}

/** GET /account/accounts/user/{userId} — ADMIN only. Returns ONE account. */
export async function getAccountByUserId(userId: number): Promise<Account> {
  const { data } = await apiClient.get<Account>(`/account/accounts/user/${userId}`);
  return data;
}

/**
 * GET /account/accounts/me — the signed-in user's own account.
 *
 * This is the one endpoint added to the backend for this frontend. Every other
 * account endpoint is ADMIN-only, so without it a USER could not read their own
 * balance or discover the `senderAccountId` a transfer requires. It derives the
 * user from the JWT, so it exposes nothing the caller is not already entitled to.
 */
export async function getMyAccount(): Promise<Account> {
  const { data } = await apiClient.get<Account>('/account/accounts/me');
  return data;
}

/** POST /account/accounts — ADMIN only. Accepts ONLY userId and accountType. */
export async function createAccount(payload: CreateAccountRequest): Promise<Account> {
  const { data } = await apiClient.post<Account>('/account/accounts', payload, {
    loading: { blocking: true, message: 'Opening account…' },
  });
  return data;
}

/** PUT /account/accounts/{id} — ADMIN only. Accepts ONLY accountType. */
export async function updateAccount(
  id: number,
  payload: UpdateAccountRequest
): Promise<Account> {
  const { data } = await apiClient.put<Account>(`/account/accounts/${id}`, payload, {
    loading: { blocking: true, message: 'Saving account…' },
  });
  return data;
}

/** DELETE /account/accounts/{id} — ADMIN only. Logical closure, 204 No Content. */
export async function closeAccount(id: number): Promise<void> {
  await apiClient.delete(`/account/accounts/${id}`, {
    loading: { blocking: true, message: 'Closing account…' },
  });
}
