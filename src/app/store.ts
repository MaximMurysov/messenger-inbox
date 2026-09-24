import {
  combineReducers,
  configureStore,
  createListenerMiddleware,
  isAnyOf,
} from '@reduxjs/toolkit'
import { messengerApi } from '../api/messengerApi'
import {
  authReducer,
  loggedOut,
  sessionExpired,
} from '../features/auth/authSlice'
import { chatReducer } from '../features/chat/chatSlice'
import { clearState, loadState, saveState } from './storage'
import type { PersistedState } from './storage'

const rootReducer = combineReducers({
  auth: authReducer,
  chat: chatReducer,
  [messengerApi.reducerPath]: messengerApi.reducer,
})

export type RootState = ReturnType<typeof rootReducer>

export function createAppStore(persisted?: PersistedState) {
  const listenerMiddleware = createListenerMiddleware()

  const appStore = configureStore({
    reducer: rootReducer,
    preloadedState: persisted && {
      auth: { credentials: persisted.credentials, sessionError: null },
      chat: {
        chatId: persisted.chatId,
        threads: persisted.threads,
        connection: 'idle' as const,
      },
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware()
        .prepend(listenerMiddleware.middleware)
        .concat(messengerApi.middleware),
  })

  /**
   * Сессию и переписку держим в localStorage, чтобы пережить перезагрузку
   * вкладки. Пишем только когда изменилось то, что сохраняем: статус
   * соединения меняется на каждом витке опроса и записи не требует.
   */
  listenerMiddleware.startListening({
    predicate: (_action, currentState, previousState) => {
      const current = currentState as RootState
      const previous = previousState as RootState
      return (
        current.auth.credentials !== previous.auth.credentials ||
        current.chat.chatId !== previous.chat.chatId ||
        current.chat.threads !== previous.chat.threads
      )
    },
    effect: (_action, listenerApi) => {
      const state = listenerApi.getState() as RootState
      if (!state.auth.credentials) {
        clearState()
        return
      }
      saveState({
        credentials: state.auth.credentials,
        chatId: state.chat.chatId,
        threads: state.chat.threads,
      })
    },
  })

  /** Кэш API не должен пережить смену учётных данных. */
  listenerMiddleware.startListening({
    matcher: isAnyOf(loggedOut, sessionExpired),
    effect: (_action, listenerApi) => {
      listenerApi.dispatch(messengerApi.util.resetApiState())
    },
  })

  return appStore
}

export const store = createAppStore(loadState())

export type AppDispatch = typeof store.dispatch
