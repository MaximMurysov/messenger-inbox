import { describe, expect, it } from 'vitest'
import { loggedOut } from '../auth/authSlice'
import {
  chatOpened,
  chatReducer,
  messageFailed,
  messageQueued,
  messageReceived,
  messageSent,
  messageStatusChanged,
} from './chatSlice'
import type { ChatState } from './chatSlice'
import type { Message } from './types'

const CHAT_ID = '79991234567@c.us'

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

function openedState(): ChatState {
  return chatReducer(
    undefined,
    chatOpened({ chatId: CHAT_ID, phone: '79991234567' }),
  )
}

describe('chatSlice', () => {
  it('открытие другого чата очищает ленту', () => {
    const withMessage = chatReducer(
      openedState(),
      messageReceived(makeMessage()),
    )
    const other = chatReducer(
      withMessage,
      chatOpened({ chatId: '79990000000@c.us', phone: '79990000000' }),
    )

    expect(other.messages).toEqual([])
  })

  it('не задваивает повторно доставленное уведомление', () => {
    let state = chatReducer(openedState(), messageReceived(makeMessage()))
    state = chatReducer(state, messageReceived(makeMessage()))

    expect(state.messages).toHaveLength(1)
  })

  it('игнорирует сообщения из чужого чата', () => {
    const state = chatReducer(
      openedState(),
      messageReceived(makeMessage({ chatId: '79990000000@c.us' })),
    )

    expect(state.messages).toEqual([])
  })

  it('держит ленту отсортированной по времени', () => {
    let state = chatReducer(
      openedState(),
      messageReceived(makeMessage({ id: 'B', timestamp: 2000 })),
    )
    state = chatReducer(
      state,
      messageReceived(makeMessage({ id: 'A', timestamp: 1000 })),
    )

    expect(state.messages.map((message) => message.id)).toEqual(['A', 'B'])
  })

  it('меняет локальный id на idMessage после отправки', () => {
    let state = chatReducer(
      openedState(),
      messageQueued(
        makeMessage({ id: 'local-1', direction: 'out', status: 'pending' }),
      ),
    )
    state = chatReducer(
      state,
      messageSent({ localId: 'local-1', idMessage: 'SRV1' }),
    )

    expect(state.messages[0]).toMatchObject({ id: 'SRV1', status: 'sent' })
  })

  it('не задваивает своё сообщение, когда API присылает его эхом', () => {
    let state = chatReducer(
      openedState(),
      messageQueued(
        makeMessage({ id: 'local-1', direction: 'out', status: 'pending' }),
      ),
    )
    state = chatReducer(
      state,
      messageSent({ localId: 'local-1', idMessage: 'SRV1' }),
    )
    state = chatReducer(
      state,
      messageReceived(makeMessage({ id: 'SRV1', direction: 'out' })),
    )

    expect(state.messages).toHaveLength(1)
  })

  it('помечает неудачную отправку и обновляет статус доставки', () => {
    let state = chatReducer(
      openedState(),
      messageQueued(
        makeMessage({ id: 'local-1', direction: 'out', status: 'pending' }),
      ),
    )
    expect(
      chatReducer(state, messageFailed('local-1')).messages[0].status,
    ).toBe('failed')

    state = chatReducer(
      state,
      messageSent({ localId: 'local-1', idMessage: 'SRV1' }),
    )
    state = chatReducer(
      state,
      messageStatusChanged({ idMessage: 'SRV1', status: 'read' }),
    )

    expect(state.messages[0].status).toBe('read')
  })

  it('выход из аккаунта сбрасывает чат', () => {
    const state = chatReducer(openedState(), loggedOut())

    expect(state).toEqual({
      chatId: null,
      phone: null,
      messages: [],
      connection: 'idle',
    })
  })
})
