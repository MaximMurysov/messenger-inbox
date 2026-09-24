import { describe, expect, it } from 'vitest'
import { loggedOut, sessionExpired } from '../auth/authSlice'
import {
  apiEchoReceived,
  chatClosed,
  chatOpened,
  chatReducer,
  messageFailed,
  messageQueued,
  messageReceived,
  messageRetrying,
  messageSent,
  messageStatusChanged,
} from './chatSlice'
import type { ChatState } from './chatSlice'
import type { Message } from './types'

const CHAT_ID = '79991234567@c.us'
const OTHER_CHAT_ID = '79990000000@c.us'

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'ID1',
    chatId: CHAT_ID,
    text: 'Привет',
    direction: 'in',
    timestamp: 1700000000000,
    status: 'delivered',
    ...overrides,
  }
}

function makeLocal(overrides: Partial<Message> = {}): Message {
  return makeMessage({
    id: 'local-1',
    direction: 'out',
    status: 'pending',
    ...overrides,
  })
}

function openedState(): ChatState {
  return chatReducer(undefined, chatOpened(CHAT_ID))
}

function ids(state: ChatState, chatId = CHAT_ID): string[] {
  return (state.threads[chatId] ?? []).map((message) => message.id)
}

describe('chatSlice', () => {
  it('закрытие и повторное открытие чата сохраняет переписку', () => {
    let state = chatReducer(openedState(), messageReceived(makeMessage()))
    state = chatReducer(state, chatClosed())
    state = chatReducer(state, chatOpened(OTHER_CHAT_ID))
    state = chatReducer(state, chatOpened(CHAT_ID))

    expect(state.chatId).toBe(CHAT_ID)
    expect(ids(state)).toEqual(['ID1'])
  })

  it('не задваивает повторно доставленное уведомление', () => {
    let state = chatReducer(openedState(), messageReceived(makeMessage()))
    state = chatReducer(state, messageReceived(makeMessage()))

    expect(ids(state)).toEqual(['ID1'])
  })

  it('сообщение из другого чата не теряется, а ложится в его ленту', () => {
    const state = chatReducer(
      openedState(),
      messageReceived(makeMessage({ id: 'B1', chatId: OTHER_CHAT_ID })),
    )

    expect(ids(state)).toEqual([])
    expect(ids(state, OTHER_CHAT_ID)).toEqual(['B1'])
  })

  it('держит порядок поступления, а не время из разных часов', () => {
    let state = chatReducer(
      openedState(),
      messageReceived(makeMessage({ id: 'B', timestamp: 2000 })),
    )
    state = chatReducer(
      state,
      messageReceived(makeMessage({ id: 'A', timestamp: 1000 })),
    )

    expect(ids(state)).toEqual(['B', 'A'])
  })

  it('меняет локальный id на idMessage после отправки', () => {
    let state = chatReducer(openedState(), messageQueued(makeLocal()))
    state = chatReducer(
      state,
      messageSent({ chatId: CHAT_ID, localId: 'local-1', idMessage: 'SRV1' }),
    )

    expect(state.threads[CHAT_ID][0]).toMatchObject({
      id: 'SRV1',
      status: 'sent',
    })
  })

  describe('эхо собственного сообщения', () => {
    const echo = makeMessage({
      id: 'SRV1',
      direction: 'out',
      status: 'sent',
    })

    it('после ответа на отправку не задваивает сообщение', () => {
      let state = chatReducer(openedState(), messageQueued(makeLocal()))
      state = chatReducer(
        state,
        messageSent({ chatId: CHAT_ID, localId: 'local-1', idMessage: 'SRV1' }),
      )
      state = chatReducer(state, apiEchoReceived(echo))

      expect(ids(state)).toEqual(['SRV1'])
    })

    it('раньше ответа на отправку тоже не задваивает', () => {
      let state = chatReducer(openedState(), messageQueued(makeLocal()))
      state = chatReducer(state, apiEchoReceived(echo))
      state = chatReducer(
        state,
        messageSent({ chatId: CHAT_ID, localId: 'local-1', idMessage: 'SRV1' }),
      )

      expect(ids(state)).toEqual(['SRV1'])
      expect(state.threads[CHAT_ID][0].status).toBe('sent')
    })

    it('забирает сообщение, помеченное неудачным из-за оборванного ответа', () => {
      let state = chatReducer(openedState(), messageQueued(makeLocal()))
      state = chatReducer(
        state,
        messageFailed({ chatId: CHAT_ID, id: 'local-1' }),
      )
      state = chatReducer(state, apiEchoReceived(echo))

      expect(ids(state)).toEqual(['SRV1'])
      expect(state.threads[CHAT_ID][0].status).toBe('sent')
    })

    it('два одинаковых текста разбираются по порядку', () => {
      let state = chatReducer(openedState(), messageQueued(makeLocal()))
      state = chatReducer(state, messageQueued(makeLocal({ id: 'local-2' })))
      state = chatReducer(state, apiEchoReceived({ ...echo, id: 'SRV1' }))
      state = chatReducer(state, apiEchoReceived({ ...echo, id: 'SRV2' }))

      expect(ids(state)).toEqual(['SRV1', 'SRV2'])
    })

    it('сообщение с другим текстом добавляется как новое', () => {
      let state = chatReducer(openedState(), messageQueued(makeLocal()))
      state = chatReducer(state, apiEchoReceived({ ...echo, text: 'Другое' }))

      expect(ids(state)).toEqual(['local-1', 'SRV1'])
    })

    it('не трогает сообщение, отправленное с телефона', () => {
      let state = chatReducer(openedState(), messageQueued(makeLocal()))
      state = chatReducer(state, messageReceived(echo))

      expect(ids(state)).toEqual(['local-1', 'SRV1'])
    })
  })

  it('«Повторить» оставляет сообщение на месте и снова делает его ожидающим', () => {
    let state = chatReducer(openedState(), messageQueued(makeLocal()))
    state = chatReducer(state, messageReceived(makeMessage()))
    state = chatReducer(
      state,
      messageFailed({ chatId: CHAT_ID, id: 'local-1' }),
    )
    expect(state.threads[CHAT_ID][0].status).toBe('failed')

    state = chatReducer(
      state,
      messageRetrying({ chatId: CHAT_ID, id: 'local-1' }),
    )
    expect(ids(state)).toEqual(['local-1', 'ID1'])
    expect(state.threads[CHAT_ID][0].status).toBe('pending')
  })

  it('обновляет статус доставки по idMessage', () => {
    let state = chatReducer(openedState(), messageQueued(makeLocal()))
    state = chatReducer(
      state,
      messageSent({ chatId: CHAT_ID, localId: 'local-1', idMessage: 'SRV1' }),
    )
    state = chatReducer(
      state,
      messageStatusChanged({ idMessage: 'SRV1', status: 'read' }),
    )

    expect(state.threads[CHAT_ID][0].status).toBe('read')
  })

  it.each([
    ['выход из аккаунта', loggedOut()],
    ['истёкшая сессия', sessionExpired('нет доступа')],
  ])('%s сбрасывает чат', (_name, action) => {
    const state = chatReducer(
      chatReducer(openedState(), messageReceived(makeMessage())),
      action,
    )

    expect(state).toEqual({ chatId: null, threads: {}, connection: 'idle' })
  })
})
