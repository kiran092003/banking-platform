import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import {
  clearTokens,
  emitSessionExpired,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '@/features/auth/tokenStorage';
import { store } from '@/app/store';
import { requestFinished, requestStarted } from '@/features/ui/loadingSlice';
import type { LoginResponse } from '@/types/auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT ?? 30_000);

/** Public auth routes — never attach a token, never try to refresh these. */
const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

function isAuthRoute(url: string | undefined): boolean {
  if (!url) return false;
  return AUTH_ROUTES.some((route) => url.startsWith(route));
}

// ---------------------------------------------------------------------------
// Global loading indicator
// ---------------------------------------------------------------------------

/** Per-request control over the global indicator. See `loadingSlice`. */
export interface RequestLoadingOptions {
  /**
   * `false` keeps the request out of the indicator entirely. For genuinely
   * background traffic only — a token refresh, a WebSocket ticket, the unread
   * badge — where a visible bar would be noise the user cannot act on.
   */
  track?: boolean;
  /**
   * `true` also shows the blocking overlay. Opt-in, for writes that must not be
   * submitted twice. A form with its own button spinner does not need it.
   */
  blocking?: boolean;
  /** Shown beside the overlay spinner. Only read when `blocking` is true. */
  message?: string;
}

declare module 'axios' {
  export interface AxiosRequestConfig {
    loading?: RequestLoadingOptions;
  }
}

/**
 * Set by `beginTracking` and cleared by `endTracking`, so a decrement can only
 * ever follow an increment for that same request. Inferring it from the options
 * instead would let a request that failed before it was counted decrement
 * another request's count.
 */
type TrackedRequest = InternalAxiosRequestConfig & { _counted?: boolean };

/**
 * Resolves the options once, on the way out, and writes the decision back onto
 * the config. The response and error interceptors then read the same decision,
 * which keeps the increment and decrement symmetric — deriving it twice would
 * risk counting up as blocking and back down as not.
 *
 * A request replayed after a token refresh passes through here again. That is
 * fine and deliberate: the already-resolved options feed the `??` defaults
 * unchanged, so the second pass counts itself and settles itself.
 */
function beginTracking(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const tracked = config as TrackedRequest;
  const options = tracked.loading ?? {};

  const track = options.track ?? true;
  const blocking = options.blocking ?? false;

  tracked.loading = { ...options, track, blocking };

  if (track) {
    tracked._counted = true;
    store.dispatch(requestStarted({ blocking, message: options.message }));
  }

  return tracked;
}

function endTracking(config: InternalAxiosRequestConfig | undefined): void {
  const tracked = config as TrackedRequest | undefined;

  if (!tracked?._counted) return;

  tracked._counted = false;
  store.dispatch(requestFinished({ blocking: tracked.loading?.blocking === true }));
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * A bare client for the refresh call itself. Using `apiClient` here would run
 * the response interceptor again on a failed refresh and recurse.
 */
const refreshClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// Request: attach the access token, start counting
// ---------------------------------------------------------------------------

apiClient.interceptors.request.use(
  (config) => {
    if (!isAuthRoute(config.url)) {
      const token = getAccessToken();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return beginTracking(config);
  },
  (error: AxiosError) => {
    // Nothing was counted yet, but be symmetric in case that ever changes.
    endTracking(error.config);
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Response: stop counting, refresh once on 401, retry each request once
// ---------------------------------------------------------------------------

type RetriableRequest = InternalAxiosRequestConfig & { _retried?: boolean };

/** In-flight refresh, shared by every request that 401s while it runs. */
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');

  const { data } = await refreshClient.post<LoginResponse>(
    '/auth/refresh',
    { refreshToken },
    // Transparent background call: the user did not ask for it and cannot act
    // on it, so it must not light up the indicator.
    { loading: { track: false } }
  );

  if (!data?.accessToken || !data?.refreshToken) {
    throw new Error('Malformed refresh response');
  }

  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

/**
 * Returns the shared refresh promise, starting one if none is running. This is
 * what prevents a burst of parallel 401s from firing N refresh calls.
 */
function requestRefresh(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => {
    endTracking(response.config);
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as RetriableRequest | undefined;
    const status = error.response?.status;

    /*
     * Closed out before the retry below, because the replay goes back through
     * this same client and counts itself. Settling here keeps one decrement per
     * increment whether or not a refresh follows.
     */
    endTracking(original);

    const shouldAttemptRefresh =
      status === 401 &&
      original !== undefined &&
      // One retry per request: no infinite refresh loop.
      original._retried !== true &&
      // A 401 from /auth/* means bad credentials or a dead refresh token.
      !isAuthRoute(original.url) &&
      getRefreshToken() !== null;

    if (!shouldAttemptRefresh) {
      return Promise.reject(error);
    }

    original._retried = true;

    try {
      const token = await requestRefresh();
      original.headers.set('Authorization', `Bearer ${token}`);
      return apiClient(original);
    } catch (refreshError) {
      // Refresh is unrecoverable: drop the session and let the app redirect.
      clearTokens();
      emitSessionExpired();
      return Promise.reject(refreshError);
    }
  }
);
