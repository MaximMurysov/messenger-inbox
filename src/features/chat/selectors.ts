import type { RootState } from '../../app/store'
import { chatIdToPhone } from '../../shared/phone'
import type { Message } from './types'

/** Один и тот же пустой массив, чтобы селектор не давал лишних перерисовок. */
const NO_MESSAGES: Message[] = []

export const selectCredentials = (state: RootState) => state.auth.credentials
export const selectSessionError = (state: RootState) => state.auth.sessionError
export const selectChatId = (state: RootState) => state.chat.chatId
export const selectPhone = (state: RootState) =>
  state.chat.chatId ? chatIdToPhone(state.chat.chatId) : null
export const selectMessages = (state: RootState) =>
  (state.chat.chatId && state.chat.threads[state.chat.chatId]) || NO_MESSAGES
export const selectConnection = (state: RootState) => state.chat.connection
