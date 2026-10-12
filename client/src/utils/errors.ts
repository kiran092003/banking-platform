import axios from 'axios';
import type { ApiErrorResponse, NormalizedApiError } from '@/types/api';

/**
 * User-facing copy per backend error code. Anything not listed falls back to a
 * status-based message so we never surface a stack trace or internal detail.
 */
const MESSAGE_BY_CODE: Record<string, string> = {
  INSUFFICIENT_BALANCE: 'This account does not have enough funds to complete the transaction.',
  DUPLICATE_TRANSACTION: 'This transaction has already been submitted.',
  ACCOUNT_NOT_FOUND: 'The account could not be found.',
  TRANSACTION_NOT_FOUND: 'The transaction could not be found.',
  ACCOUNT_SERVICE_UNAVAILABLE:
    'The account service is temporarily unavailable. Please try again in a moment.',
  DATABASE_CONSTRAINT_VIOLATION: 'That change conflicts with existing data.',
  INTERNAL_SERVER_ERROR: 'Something went wrong on our side. Please try again.',
};

const MESSAGE_BY_STATUS: Record<number, string> = {
  400: 'Please check the information you entered and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'We could not find what you were looking for.',
  409: 'That action conflicts with the current state.',
  422: 'This transaction cannot be processed.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our side. Please try again.',
  503: 'The service is temporarily unavailable. Please try again in a moment.',
};

/**
 * Turns any thrown value into a predictable, safe-to-render error.
 *
 * Note on 500s: account-service wraps Spring Security's AccessDeniedException in
 * its catch-all handler, so an authorisation failure arrives as 500 rather than
 * 403. We keep the generic message for 500 — see `isLikelyAuthorizationFailure`.
 */
export function normalizeApiError(error: unknown): NormalizedApiError {
  if (axios.isAxiosError(error)) {
    const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';

    if (!error.response) {
      return {
        status: 0,
        code: null,
        isNetworkError: !isTimeout,
        isTimeout,
        message: isTimeout
          ? 'The request timed out. Please check your connection and try again.'
          : 'Unable to reach the server. Please check your connection and try again.',
      };
    }

    const status = error.response.status;
    const data = error.response.data as ApiErrorResponse & { error?: string };
    const code = typeof data?.error === 'string' ? data.error : null;

    // Validation errors carry a specific, user-safe message from the backend.
    const backendMessage =
      typeof data?.message === 'string' && data.message.trim().length > 0
        ? data.message
        : null;

    let message =
      (code ? MESSAGE_BY_CODE[code] : undefined) ??
      MESSAGE_BY_STATUS[status] ??
      'Something went wrong. Please try again.';

    // Surface backend validation detail — it is written for end users.
    if (status === 400 && backendMessage && (code === 'VALIDATION_ERROR' || code === 'INVALID_TRANSACTION')) {
      message = backendMessage;
    }

    /*
     * A 409 from auth-service carries the reason a role change was refused —
     * "You cannot change your own role", "The last administrator cannot be
     * demoted". Those sentences are written for the admin who triggered them,
     * so they beat the generic conflict copy.
     *
     * Only when the code is not one we have curated copy for: a recognised
     * code like DATABASE_CONSTRAINT_VIOLATION keeps its own wording.
     */
    if (status === 409 && backendMessage && !(code && MESSAGE_BY_CODE[code])) {
      message = backendMessage;
    }

    // The gateway's filters return {"error": "<human sentence>"} on 401/429.
    if ((status === 401 || status === 429) && code && code.includes(' ')) {
      message = code;
    }

    return { status, code, message, isNetworkError: false, isTimeout: false };
  }

  return {
    status: 0,
    code: null,
    message: 'Something went wrong. Please try again.',
    isNetworkError: false,
    isTimeout: false,
  };
}

/**
 * account-service turns AccessDeniedException into a 500 (its
 * `@ExceptionHandler(Exception.class)` runs before Spring's own 403 handling).
 * A 500 from an account endpoint for a non-ADMIN user is therefore almost
 * always an authorisation failure, and we can say something useful instead of
 * "something went wrong".
 */
export function isLikelyAuthorizationFailure(
  error: NormalizedApiError,
  isAdmin: boolean
): boolean {
  return (error.status === 403 || error.status === 500) && !isAdmin;
}
