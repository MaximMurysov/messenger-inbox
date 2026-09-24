/** Учётные данные инстанса API, которые вводит пользователь. */
export type Credentials = {
  idInstance: string
  apiTokenInstance: string
}

export type SendMessageRequest = {
  chatId: string
  message: string
}

export type SendMessageResponse = {
  idMessage: string
}

export type ApiMessageData = {
  typeMessage: string
  textMessageData?: { textMessage: string }
  extendedTextMessageData?: { text: string }
}

export type ApiNotificationBody = {
  typeWebhook: string
  /** Время события в секундах. */
  timestamp: number
  idMessage?: string
  status?: string
  senderData?: {
    chatId: string
    sender?: string
    senderName?: string
  }
  messageData?: ApiMessageData
}

export type ApiNotification = {
  receiptId: number
  body: ApiNotificationBody
}

export type DeleteNotificationResponse = {
  result: boolean
}
