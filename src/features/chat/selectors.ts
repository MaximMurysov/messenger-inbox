import type { RootState } from '../../app/store'

export const selectCredentials = (state: RootState) => state.auth.credentials
export const selectChatId = (state: RootState) => state.chat.chatId
export const selectPhone = (state: RootState) => state.chat.phone
export const selectMessages = (state: RootState) => state.chat.messages
export const selectConnection = (state: RootState) => state.chat.connection
