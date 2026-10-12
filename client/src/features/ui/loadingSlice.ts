import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { loggedOut } from '@/features/auth/authSlice';

/**
 * Global request-activity state, fed by the axios interceptors in
 * `src/api/axios.ts`. Every call that goes through `apiClient` is counted, so
 * no page has to remember to report its own loading state.
 *
 * `pending` is a counter rather than a boolean on purpose: the dashboard fires
 * several queries at once, and with a boolean the first one to finish would
 * switch the indicator off while the others were still in flight.
 *
 * Two levels:
 *   - `pending`  — anything in flight. Drives the thin top progress bar, which
 *                  never blocks interaction.
 *   - `blocking` — the few writes that must not be double-submitted (a
 *                  transfer, an account change, a role change). Drives the
 *                  overlay, and is opt-in per request.
 */
export interface LoadingState {
  pending: number;
  blocking: number;
  /** Label shown beside the blocking spinner, e.g. "Submitting transfer…". */
  message: string | null;
}

const initialState: LoadingState = {
  pending: 0,
  blocking: 0,
  message: null,
};

const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    requestStarted(
      state,
      action: PayloadAction<{ blocking: boolean; message?: string }>
    ) {
      state.pending += 1;

      if (action.payload.blocking) {
        state.blocking += 1;
        if (action.payload.message) {
          state.message = action.payload.message;
        }
      }
    },

    /**
     * Must be dispatched exactly once per `requestStarted`, including on
     * failure — otherwise the counter never returns to zero and the indicator
     * stays on screen. The response *and* error interceptors both call it.
     */
    requestFinished(state, action: PayloadAction<{ blocking: boolean }>) {
      state.pending = Math.max(state.pending - 1, 0);

      if (action.payload.blocking) {
        state.blocking = Math.max(state.blocking - 1, 0);
        if (state.blocking === 0) {
          state.message = null;
        }
      }
    },

    loadingReset() {
      return initialState;
    },
  },

  extraReducers: (builder) => {
    /*
     * Signing out drops the React Query cache and navigates away, so any
     * in-flight request becomes irrelevant. Without this, a request that was
     * still running at sign-out would leave the counter stuck above zero and
     * pin the indicator on the login screen.
     */
    builder.addCase(loggedOut, () => initialState);
  },
});

export const { requestStarted, requestFinished, loadingReset } = loadingSlice.actions;
export default loadingSlice.reducer;
