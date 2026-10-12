import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser, LoginResponse } from '@/types/auth';
import { isTokenExpired, userFromAccessToken } from '@/utils/jwt';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './tokenStorage';

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** True until we have restored any session from storage on boot. */
  isInitialized: boolean;
}

/**
 * Restores the session from storage.
 *
 * An expired access token is NOT treated as signed-out: the refresh token may
 * still be good, and the first request will transparently refresh. We only drop
 * the session when the access token is unreadable or there is no refresh token.
 */
function restoreInitialState(): AuthState {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!accessToken || !refreshToken) {
    return { user: null, accessToken: null, refreshToken: null, isInitialized: true };
  }

  const user = userFromAccessToken(accessToken);

  if (!user || (isTokenExpired(accessToken) && !refreshToken)) {
    clearTokens();
    return { user: null, accessToken: null, refreshToken: null, isInitialized: true };
  }

  return { user, accessToken, refreshToken, isInitialized: true };
}

const initialState: AuthState = restoreInitialState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Applies a successful login or refresh response. */
    credentialsReceived(state, action: PayloadAction<LoginResponse>) {
      const { accessToken, refreshToken } = action.payload;
      const user = userFromAccessToken(accessToken);

      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.user = user;
      state.isInitialized = true;

      setTokens(accessToken, refreshToken);
    },

    /** Clears the session. Used by sign-out and by refresh failure. */
    loggedOut(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isInitialized = true;
      clearTokens();
    },
  },
});

export const { credentialsReceived, loggedOut } = authSlice.actions;
export default authSlice.reducer;
