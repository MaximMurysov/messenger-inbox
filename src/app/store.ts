import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit'
import { messengerApi } from '../api/messengerApi'
import { authReducer } from '../features/auth/authSlice'
import { chatReducer } from '../features/chat/chatSlice'
import { clearState, loadState, saveState } from './storage'

const persisted = loadState()

const listenerMiddleware = createListenerMiddleware()

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    [messengerApi.reducerPath]: messengerApi.reducer,
  },
  preloadedState: persisted && {
    auth: { credentials: persisted.credentials },
    chat: {
      chatId: persisted.chat.chatId,
      phone: persisted.chat.phone,
      messages: persisted.chat.messages,
      connection: 'idle' as const,
    },
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .prepend(listenerMiddleware.middleware)
      .concat(messengerApi.middleware),
})

/** Сессию и переписку держим в localStorage, чтобы пережить перезагрузку вкладки. */
listenerMiddleware.startListening({
  predicate: (action) =>
    action.type.startsWith('chat/') || action.type.startsWith('auth/'),
  effect: (_action, listenerApi) => {
    const state = listenerApi.getState() as RootState
    if (!state.auth.credentials) {
      clearState()
      return
    }
    saveState({
      credentials: state.auth.credentials,
      chat: {
        chatId: state.chat.chatId,
        phone: state.chat.phone,
        messages: state.chat.messages,
      },
    })
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
