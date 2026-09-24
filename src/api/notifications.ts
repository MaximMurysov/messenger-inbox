import type { Message, MessageStatus } from '../features/chat/types'
import type { ApiMessageData, ApiNotification } from './types'

/** Что уведомление значит для нашего чата. */
export type NotificationEvent =
  | {
      kind: 'message'
      message: Message
      /** Отправлено через API — значит, это эхо нашего же сообщения. */
      sentViaApi: boolean
    }
  | { kind: 'status'; idMessage: string; status: MessageStatus }
  | { kind: 'ignored' }

const STATUS_MAP: Record<string, MessageStatus> = {
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  played: 'read',
  failed: 'failed',
  noAccount: 'failed',
  notInGroup: 'failed',
}

/** Текст поддерживаем только у обычных и «расширенных» текстовых сообщений. */
function extractText(messageData: ApiMessageData | undefined): string | null {
  if (!messageData) return null
  if (messageData.textMessageData?.textMessage) {
    return messageData.textMessageData.textMessage
  }
  if (messageData.extendedTextMessageData?.text) {
    return messageData.extendedTextMessageData.text
  }
  return null
}

export function parseNotification(
  notification: ApiNotification,
): NotificationEvent {
  const { body } = notification
  if (!body) return { kind: 'ignored' }

  switch (body.typeWebhook) {
    case 'incomingMessageReceived':
    case 'outgoingMessageReceived':
    case 'outgoingAPIMessageReceived': {
      const text = extractText(body.messageData)
      const chatId = body.senderData?.chatId
      if (!text || !chatId || !body.idMessage) return { kind: 'ignored' }

      const direction =
        body.typeWebhook === 'incomingMessageReceived' ? 'in' : 'out'
      // Без времени от сервера лента остаётся читаемой: берём текущее.
      const timestamp = Number.isFinite(body.timestamp)
        ? body.timestamp * 1000
        : Date.now()

      return {
        kind: 'message',
        message: {
          id: body.idMessage,
          chatId,
          text,
          direction,
          timestamp,
          status: direction === 'in' ? 'delivered' : 'sent',
        },
        sentViaApi: body.typeWebhook === 'outgoingAPIMessageReceived',
      }
    }

    case 'outgoingMessageStatus': {
      const status = body.status ? STATUS_MAP[body.status] : undefined
      if (!status || !body.idMessage) return { kind: 'ignored' }
      return { kind: 'status', idMessage: body.idMessage, status }
    }

    default:
      // Медиа, звонки, смена состояния инстанса — из очереди удаляем, но не показываем.
      return { kind: 'ignored' }
  }
}
