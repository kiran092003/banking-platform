/**
 * Error shapes returned by the platform.
 *
 * The OpenAPI documents advertise the success DTO for error responses, which is
 * a springdoc annotation artifact — the services actually return the shapes
 * below (verified against GlobalExceptionHandler in transaction-service and
 * account-service, and the gateway filters).
 */

/** transaction-service ApiErrorResponse (also matches account-service ErrorResponse). */
export interface ApiErrorResponse {
  timestamp?: string;
  status?: number;
  /** Machine-readable code, e.g. INSUFFICIENT_BALANCE. */
  error?: string;
  message?: string;
  path?: string;
}

/** The gateway's own filters emit `{"error": "..."}` on 401 and 429. */
export interface GatewayErrorResponse {
  error?: string;
}

/** Backend error codes observed in the services' exception handlers. */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_TRANSACTION'
  | 'TRANSACTION_NOT_FOUND'
  | 'ACCOUNT_NOT_FOUND'
  | 'DUPLICATE_TRANSACTION'
  | 'INSUFFICIENT_BALANCE'
  | 'DATABASE_CONSTRAINT_VIOLATION'
  | 'ACCOUNT_SERVICE_UNAVAILABLE'
  | 'INTERNAL_SERVER_ERROR';

/** Normalised error every UI surface consumes. */
export interface NormalizedApiError {
  /** HTTP status, or 0 for network/timeout failures. */
  status: number;
  code: string | null;
  /** Safe to render to the user — never a stack trace or internal detail. */
  message: string;
  isNetworkError: boolean;
  isTimeout: boolean;
}
