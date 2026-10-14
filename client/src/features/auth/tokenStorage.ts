/**
 * Single source of truth for tokens.
 *
 * The Axios interceptors and the Redux slice both read through here, which
 * avoids a circular import between the store and the HTTP client and keeps
 * token handling in one place.
 *
 * Tokens live in web storage so a refresh does not sign the user out. That is
 * the accepted trade-off for a token-based SPA: it is readable by any script on
 * the origin, so the real mitigations are the backend's short access-token TTL
 * (15 minutes), refresh-token revocation on logout, and strict authorisation on
 * every endpoint. The frontend is not the security boundary.
 *
 * Which storage is used is what "Remember me" on the sign-in form decides. See
 * `setTokens`.
 */

const ACCESS_TOKEN_KEY = 'bp.accessToken';
const REFRESH_TOKEN_KEY = 'bp.refreshToken';

/**
 * `local` outlives the browser session; `session` is scoped to the tab and is
 * dropped when it closes. Nothing else about the session differs — the backend
 * is told nothing about this choice and the refresh token has the same 7-day
 * expiry either way.
 */
type StoreKind = 'local' | 'session';

/** Mirrors web storage so the request interceptor never touches disk. */
let accessTokenCache: string | null = null;
let refreshTokenCache: string | null = null;
let hydrated = false;

/**
 * Where tokens are read from and written to. Chosen by `setTokens` at sign-in
 * and recovered by `hydrate` on a reload, so a token refresh hours later still
 * writes back to the store the user originally opted into.
 */
let activeStore: StoreKind = 'local';

/** Returns null rather than throwing in private mode or with storage blocked. */
function storage(kind: StoreKind): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function readFrom(kind: StoreKind): { access: string | null; refresh: string | null } {
  try {
    const store = storage(kind);
    return {
      access: store?.getItem(ACCESS_TOKEN_KEY) ?? null,
      refresh: store?.getItem(REFRESH_TOKEN_KEY) ?? null,
    };
  } catch {
    return { access: null, refresh: null };
  }
}

function clearStore(kind: StoreKind): void {
  try {
    const store = storage(kind);
    store?.removeItem(ACCESS_TOKEN_KEY);
    store?.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Nothing to do — the in-memory cache is cleared by the caller.
  }
}

/**
 * Restores tokens on boot, and with them the storage the user chose.
 *
 * localStorage is checked first: a remembered session is the longer-lived of
 * the two, and a tab-scoped one cannot exist without this tab having written
 * it. Finding tokens in sessionStorage is what tells us "Remember me" was left
 * unchecked, since the choice itself is never persisted separately.
 */
function hydrate(): void {
  if (hydrated) return;
  hydrated = true;

  const local = readFrom('local');

  if (local.access || local.refresh) {
    activeStore = 'local';
    accessTokenCache = local.access;
    refreshTokenCache = local.refresh;
    return;
  }

  const session = readFrom('session');

  if (session.access || session.refresh) {
    activeStore = 'session';
    accessTokenCache = session.access;
    refreshTokenCache = session.refresh;
    return;
  }

  activeStore = 'local';
  accessTokenCache = null;
  refreshTokenCache = null;
}

export function getAccessToken(): string | null {
  hydrate();
  return accessTokenCache;
}

export function getRefreshToken(): string | null {
  hydrate();
  return refreshTokenCache;
}

/**
 * Stores a token pair.
 *
 * `remember` is passed only at sign-in, where the user has just answered the
 * question. Every later call — notably the interceptor's silent refresh — omits
 * it and keeps whichever store is already in use, so a refresh cannot quietly
 * promote a tab-scoped session into a remembered one.
 */
export function setTokens(
  accessToken: string,
  refreshToken: string,
  remember?: boolean
): void {
  hydrate();

  if (remember !== undefined) {
    const chosen: StoreKind = remember ? 'local' : 'session';

    // Leave nothing behind in the store we are moving away from, or a stale
    // pair there would be picked up by the next hydrate.
    if (chosen !== activeStore) clearStore(activeStore);

    activeStore = chosen;
  }

  accessTokenCache = accessToken;
  refreshTokenCache = refreshToken;

  try {
    const store = storage(activeStore);
    store?.setItem(ACCESS_TOKEN_KEY, accessToken);
    store?.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch {
    // Private mode or blocked storage: the in-memory cache still works for
    // this tab, the session just will not survive a reload.
  }
}

/** Clears both stores, so no pair can survive a sign-out in either one. */
export function clearTokens(): void {
  accessTokenCache = null;
  refreshTokenCache = null;
  hydrated = true;
  activeStore = 'local';

  clearStore('local');
  clearStore('session');
}

/**
 * Fired when a refresh attempt fails and the session is unrecoverable.
 * The app subscribes once (see `SessionExpiryListener`) to clear Redux state,
 * drop cached queries and route to /login.
 */
export const SESSION_EXPIRED_EVENT = 'bp:session-expired';

export function emitSessionExpired(): void {
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}
