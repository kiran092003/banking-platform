import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { loggedOut } from '@/features/auth/authSlice';

/**
 * Application-level UI state only. Server data lives in React Query, never here.
 */
export interface UiState {
  isMobileNavOpen: boolean;
  /*
   * Sign-out is reachable from the sidebar and from Settings, and the sidebar
   * itself is unmounted with the mobile drawer. Keeping the flag here lets a
   * single dialog live in AppShell, above both, so neither trigger can take
   * the open dialog down with it.
   */
  isSignOutOpen: boolean;
}

const initialState: UiState = {
  isMobileNavOpen: false,
  isSignOutOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    mobileNavToggled(state) {
      state.isMobileNavOpen = !state.isMobileNavOpen;
    },
    mobileNavSet(state, action: PayloadAction<boolean>) {
      state.isMobileNavOpen = action.payload;
    },
    signOutDialogSet(state, action: PayloadAction<boolean>) {
      state.isSignOutOpen = action.payload;
      // Opening the dialog dismisses the drawer, so only one overlay is up.
      if (action.payload) state.isMobileNavOpen = false;
    },
  },

  /*
   * Both overlays are closed once the session ends, whether that was this
   * dialog or an expired refresh token. Without this the flag would survive
   * into the next session and the dialog would greet the next sign-in.
   */
  extraReducers: (builder) => {
    builder.addCase(loggedOut, (state) => {
      state.isSignOutOpen = false;
      state.isMobileNavOpen = false;
    });
  },
});

export const { mobileNavToggled, mobileNavSet, signOutDialogSet } =
  uiSlice.actions;
export default uiSlice.reducer;
