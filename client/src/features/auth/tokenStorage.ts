/**
 * Single source of truth for tokens.
 *
 * The Axios interceptors and the Redux slice both read through here, which
 * avoids a circular import between the store and the HTTP client and keeps
 * token handling in one place.
 *
 * Tokens live in localStorage so a refresh does not sign the user out. That is
 * the accepted trade-off for a token-based SPA: it is readable by any script on
 * the origin, so the real mitigations are the backend's short access-token TTL
 * (15 minutes), refresh-token revocation on logout, and strict authorisation on
 * every endpoint. The frontend is not the security boundary.
 */

const ACCESS_TOKEN_KEY = 'bp.accessToken';
const REFRESH_TOKEN_KEY = 'bp.refreshToken';

/** Mirrors localStorage so the request interceptor never touches disk. */
let accessTokenCache: string | null = null;
let refreshTokenCache: string | null = null;
let hydrated = false;

function hydrate(): void {
  if (hydrated) return;
  try {
    accessTokenCache = localStorage.getItem(ACCESS_TOKEN_KEY);
    refreshTokenCache = localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    accessTokenCache = null;
    refreshTokenCache = null;
  }
  hydrated = true;
}

export function getAccessToken(): string | null {
  hydrate();
  return accessTokenCache;
}

export function getRefreshToken(): string | null {
  hydrate();
  return refreshTokenCache;
}

export function setTokens(accessToken: string, refreshToken: string): void {
  accessTokenCache = accessToken;
  refreshTokenCache = refreshToken;
  hydrated = true;
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch {
    // Private mode or blocked storage: the in-memory cache still works for
    // this tab, the session just will not survive a reload.
  }
}

export function clearTokens(): void {
  accessTokenCache = null;
  refreshTokenCache = null;
  hydrated = true;
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Nothing to do — the in-memory cache is already cleared.
  }
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
