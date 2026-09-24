import { createSlice, isAnyOf } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { loggedOut, sessionExpired } from '../auth/authSlice'
import { isLocalId } from './types'
import type { ConnectionStatus, Message, MessageStatus } from './types'

export type ChatState = {
  /** Открытый чат в формате API, например 79991234567@c.us. */
  chatId: string | null
  /** Переписка по каждому чату: закрытый чат не теряет историю. */
  threads: Record<string, Message[]>
  connection: ConnectionStatus
}

const initialState: ChatState = {
  chatId: null,
  threads: {},
  connection: 'idle',
}

type Thread = Message[]

function threadOf(state: ChatState, chatId: string): Thread {
  state.threads[chatId] ??= []
  return state.threads[chatId]
}

function findById(state: ChatState, chatId: string, id: string) {
  return state.threads[chatId]?.find((item) => item.id === id)
}

/**
 * Порядок ленты — порядок поступления. Время сообщений берётся из двух разных
 * часов (клиентских у исходящих, серверных у входящих), и сортировка по нему
 * переставляла бы сообщения при любом расхождении часов.
 */
const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    chatOpened(state, action: PayloadAction<string>) {
      state.chatId = action.payload
    },

    chatClosed(state) {
      state.chatId = null
      state.connection = 'idle'
    },

    /** Оптимистично показываем отправляемое сообщение. */
    messageQueued(state, action: PayloadAction<Message>) {
      threadOf(state, action.payload.chatId).push(action.payload)
    },

    /** API подтвердил отправку: подменяем локальный id на idMessage. */
    messageSent(
      state,
      action: PayloadAction<{
        chatId: string
        localId: string
        idMessage: string
      }>,
    ) {
      const { chatId, localId, idMessage } = action.payload
      const thread = state.threads[chatId]
      const message = findById(state, chatId, localId)
      // Эхо могло прийти раньше ответа и уже забрать это сообщение себе.
      if (!thread || !message) return

      if (thread.some((item) => item.id === idMessage)) {
        state.threads[chatId] = thread.filter((item) => item.id !== localId)
        return
      }
      message.id = idMessage
      message.status = 'sent'
    },

    messageFailed(
      state,
      action: PayloadAction<{ chatId: string; id: string }>,
    ) {
      const message = findById(state, action.payload.chatId, action.payload.id)
      if (message) message.status = 'failed'
    },

    /** «Повторить»: то же сообщение на том же месте, снова в пути. */
    messageRetrying(
      state,
      action: PayloadAction<{ chatId: string; id: string }>,
    ) {
      const message = findById(state, action.payload.chatId, action.payload.id)
      if (message) message.status = 'pending'
    },

    /**
     * Сообщение из очереди уведомлений. Повторная доставка того же
     * уведомления не должна задваивать сообщение в ленте.
     */
    messageReceived(state, action: PayloadAction<Message>) {
      const incoming = action.payload
      if (findById(state, incoming.chatId, incoming.id)) return
      threadOf(state, incoming.chatId).push(incoming)
    },

    /**
     * Эхо нашего сообщения, отправленного через API. Оно может прийти раньше,
     * чем ответ на сам запрос отправки (или вместо него, если запрос оборвался
     * по таймауту, а сервер сообщение принял) — тогда забираем самое раннее
     * неподтверждённое сообщение с тем же текстом, а не добавляем дубль.
     */
    apiEchoReceived(state, action: PayloadAction<Message>) {
      const incoming = action.payload
      if (findById(state, incoming.chatId, incoming.id)) return

      const pending = state.threads[incoming.chatId]?.find(
        (item) =>
          isLocalId(item.id) &&
          item.direction === 'out' &&
          (item.status === 'pending' || item.status === 'failed') &&
          item.text === incoming.text,
      )
      if (pending) {
        pending.id = incoming.id
        pending.status = incoming.status
        return
      }
      threadOf(state, incoming.chatId).push(incoming)
    },

    messageStatusChanged(
      state,
      action: PayloadAction<{ idMessage: string; status: MessageStatus }>,
    ) {
      for (const thread of Object.values(state.threads)) {
        const message = thread.find(
          (item) => item.id === action.payload.idMessage,
        )
        if (message) {
          message.status = action.payload.status
          return
        }
      }
    },

    connectionStatusChanged(state, action: PayloadAction<ConnectionStatus>) {
      state.connection = action.payload
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(isAnyOf(loggedOut, sessionExpired), () => initialState)
  },
})

export const {
  chatOpened,
  chatClosed,
  messageQueued,
  messageSent,
  messageFailed,
  messageRetrying,
  messageReceived,
  apiEchoReceived,
  messageStatusChanged,
  connectionStatusChanged,
} = chatSlice.actions

export const chatReducer = chatSlice.reducer
