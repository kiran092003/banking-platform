import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * Application-level UI state only. Server data lives in React Query, never here.
 */
export interface UiState {
  isMobileNavOpen: boolean;
}

const initialState: UiState = {
  isMobileNavOpen: false,
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
  },
});

export const { mobileNavToggled, mobileNavSet } = uiSlice.actions;
export default uiSlice.reducer;
