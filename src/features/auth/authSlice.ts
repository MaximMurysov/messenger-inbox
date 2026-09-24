import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Credentials } from '../../api/types'

export type AuthState = {
  credentials: Credentials | null
}

const initialState: AuthState = {
  credentials: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    credentialsSet(state, action: PayloadAction<Credentials>) {
      state.credentials = action.payload
    },
    loggedOut(state) {
      state.credentials = null
    },
  },
})

export const { credentialsSet, loggedOut } = authSlice.actions
export const authReducer = authSlice.reducer
