import { describe, expect, it } from 'vitest'
import { parseNotification } from './notifications'
import type { ApiNotification } from './types'

function notification(body: ApiNotification['body']): ApiNotification {
  return { receiptId: 1, body }
}

describe('parseNotification', () => {
  it('разбирает входящее текстовое сообщение', () => {
    const event = parseNotification(
      notification({
        typeWebhook: 'incomingMessageReceived',
        timestamp: 1700000000,
        idMessage: 'ABC123',
        senderData: { chatId: '79991234567@c.us' },
        messageData: {
          typeMessage: 'textMessage',
          textMessageData: { textMessage: 'Привет' },
        },
      }),
    )

    expect(event).toEqual({
      kind: 'message',
      message: {
        id: 'ABC123',
        chatId: '79991234567@c.us',
        text: 'Привет',
        direction: 'in',
        timestamp: 1700000000000,
        status: 'delivered',
      },
      sentViaApi: false,
    })
  })

  it('понимает расширенный текст и исходящее направление', () => {
    const event = parseNotification(
      notification({
        typeWebhook: 'outgoingAPIMessageReceived',
        timestamp: 1700000000,
        idMessage: 'OUT1',
        senderData: { chatId: '79991234567@c.us' },
        messageData: {
          typeMessage: 'extendedTextMessage',
          extendedTextMessageData: { text: 'Ссылка' },
        },
      }),
    )

    expect(event).toMatchObject({
      kind: 'message',
      message: { direction: 'out', text: 'Ссылка', status: 'sent' },
      sentViaApi: true,
    })
  })

  it('исходящее с телефона не считается эхом отправки через API', () => {
    const event = parseNotification(
      notification({
        typeWebhook: 'outgoingMessageReceived',
        timestamp: 1700000000,
        idMessage: 'PH1',
        senderData: { chatId: '79991234567@c.us' },
        messageData: {
          typeMessage: 'textMessage',
          textMessageData: { textMessage: 'С телефона' },
        },
      }),
    )

    expect(event).toMatchObject({ kind: 'message', sentViaApi: false })
  })

  it('не падает на уведомлении без тела', () => {
    expect(parseNotification({ receiptId: 1, body: null })).toEqual({
      kind: 'ignored',
    })
  })

  it('подставляет текущее время, если сервер не прислал timestamp', () => {
    const event = parseNotification(
      notification({
        typeWebhook: 'incomingMessageReceived',
        idMessage: 'NOTIME',
        senderData: { chatId: '79991234567@c.us' },
        messageData: {
          typeMessage: 'textMessage',
          textMessageData: { textMessage: 'Привет' },
        },
      } as unknown as ApiNotification['body']),
    )

    expect(event).toMatchObject({ kind: 'message' })
    if (event.kind === 'message') {
      expect(Number.isFinite(event.message.timestamp)).toBe(true)
    }
  })

  it('переводит статус доставки в статус сообщения', () => {
    expect(
      parseNotification(
        notification({
          typeWebhook: 'outgoingMessageStatus',
          timestamp: 1700000000,
          idMessage: 'OUT1',
          status: 'read',
        }),
      ),
    ).toEqual({ kind: 'status', idMessage: 'OUT1', status: 'read' })
  })

  it('пропускает нетекстовые сообщения и незнакомые события', () => {
    expect(
      parseNotification(
        notification({
          typeWebhook: 'incomingMessageReceived',
          timestamp: 1700000000,
          idMessage: 'IMG1',
          senderData: { chatId: '79991234567@c.us' },
          messageData: { typeMessage: 'imageMessage' },
        }),
      ),
    ).toEqual({ kind: 'ignored' })

    expect(
      parseNotification(
        notification({
          typeWebhook: 'stateInstanceChanged',
          timestamp: 1700000000,
        }),
      ),
    ).toEqual({ kind: 'ignored' })
  })
})
