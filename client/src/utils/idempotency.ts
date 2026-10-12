/**
 * The backend requires an idempotency key of 16–100 characters on every
 * transaction, and rejects a key reused by a different user (409 /
 * DUPLICATE_TRANSACTION). A key is generated once per transfer attempt and
 * reused across retries of that same attempt so a retry can never double-spend.
 */
export function generateIdempotencyKey(): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random()
          .toString(16)
          .slice(2)}`;

  // "idm_" + 32 hex chars = 36 characters, comfortably inside 16–100.
  return `idm_${uuid.replace(/-/g, '')}`;
}
