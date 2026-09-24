import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { loggedOut } from '../auth/authSlice'
import type { ConnectionStatus, Message, MessageStatus } from './types'

export type ChatState = {
  /** Идентификатор открытого чата в формате API, например 79991234567@c.us. */
  chatId: string | null
  /** Номер собеседника цифрами — для показа в шапке. */
  phone: string | null
  messages: Message[]
  connection: ConnectionStatus
}

const initialState: ChatState = {
  chatId: null,
  phone: null,
  messages: [],
  connection: 'idle',
}

function byTimestamp(a: Message, b: Message): number {
  return a.timestamp - b.timestamp
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    chatOpened(
      state,
      action: PayloadAction<{ chatId: string; phone: string }>,
    ) {
      if (state.chatId !== action.payload.chatId) {
        state.messages = []
      }
      state.chatId = action.payload.chatId
      state.phone = action.payload.phone
    },

    chatClosed(state) {
      state.chatId = null
      state.phone = null
      state.messages = []
      state.connection = 'idle'
    },

    /** Оптимистично показываем отправляемое сообщение. */
    messageQueued(state, action: PayloadAction<Message>) {
      state.messages.push(action.payload)
    },

    /** API подтвердил отправку: подменяем локальный id на idMessage. */
    messageSent(
      state,
      action: PayloadAction<{ localId: string; idMessage: string }>,
    ) {
      const message = state.messages.find(
        (item) => item.id === action.payload.localId,
      )
      if (!message) return
      message.id = action.payload.idMessage
      message.status = 'sent'
    },

    messageFailed(state, action: PayloadAction<string>) {
      const message = state.messages.find((item) => item.id === action.payload)
      if (message) message.status = 'failed'
    },

    messageRemoved(state, action: PayloadAction<string>) {
      state.messages = state.messages.filter(
        (item) => item.id !== action.payload,
      )
    },

    /**
     * Сообщение из очереди уведомлений. Повторная доставка того же
     * уведомления не должна задваивать сообщение в ленте.
     */
    messageReceived(state, action: PayloadAction<Message>) {
      const incoming = action.payload
      if (incoming.chatId !== state.chatId) return
      if (state.messages.some((item) => item.id === incoming.id)) return
      state.messages.push(incoming)
      state.messages.sort(byTimestamp)
    },

    messageStatusChanged(
      state,
      action: PayloadAction<{ idMessage: string; status: MessageStatus }>,
    ) {
      const message = state.messages.find(
        (item) => item.id === action.payload.idMessage,
      )
      if (message) message.status = action.payload.status
    },

    connectionStatusChanged(state, action: PayloadAction<ConnectionStatus>) {
      state.connection = action.payload
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loggedOut, () => initialState)
  },
})

export const {
  chatOpened,
  chatClosed,
  messageQueued,
  messageSent,
  messageFailed,
  messageRemoved,
  messageReceived,
  messageStatusChanged,
  connectionStatusChanged,
} = chatSlice.actions

export const chatReducer = chatSlice.reducer
