import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Credentials } from '../../api/types'

export type AuthState = {
  credentials: Credentials | null
  /** Почему нас выбросило на экран входа, если это случилось не по кнопке. */
  sessionError: string | null
}

const initialState: AuthState = {
  credentials: null,
  sessionError: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    credentialsSet(state, action: PayloadAction<Credentials>) {
      state.credentials = action.payload
      state.sessionError = null
    },
    loggedOut(state) {
      state.credentials = null
      state.sessionError = null
    },
    /** API перестал принимать сохранённые учётные данные. */
    sessionExpired(state, action: PayloadAction<string>) {
      state.credentials = null
      state.sessionError = action.payload
    },
    sessionErrorDismissed(state) {
      state.sessionError = null
    },
  },
})

export const {
  credentialsSet,
  loggedOut,
  sessionExpired,
  sessionErrorDismissed,
} = authSlice.actions
export const authReducer = authSlice.reducer

export const SESSION_INVALID_MESSAGE =
  'Сессия недействительна: API не принял idInstance или токен. Войдите заново.'
