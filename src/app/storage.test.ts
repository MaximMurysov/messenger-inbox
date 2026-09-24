import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Message } from '../features/chat/types'
import {
  clearState,
  loadState,
  parsePersistedState,
  saveState,
} from './storage'
import type { PersistedState } from './storage'

const CHAT_ID = '79991234567@c.us'

function message(index: number, overrides: Partial<Message> = {}): Message {
  return {
    id: `ID${index}`,
    chatId: CHAT_ID,
    text: `Сообщение ${index}`,
    direction: 'in',
    timestamp: 1700000000000 + index,
    status: 'delivered',
    ...overrides,
  }
}

function persisted(messages: Message[]): PersistedState {
  return {
    credentials: { idInstance: '1101234567', apiTokenInstance: 'tok' },
    chatId: CHAT_ID,
    threads: { [CHAT_ID]: messages },
  }
}

/** Минимальная замена localStorage, у которой можно включить переполнение. */
function stubLocalStorage(maxValueLength = Infinity) {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (value.length > maxValueLength) throw new Error('QuotaExceededError')
      data.set(key, value)
    },
    removeItem: (key: string) => void data.delete(key),
  })
  return data
}

function manyMessages(count: number): Message[] {
  return Array.from({ length: count }, (_, index) => message(index))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('parsePersistedState', () => {
  it('принимает корректное состояние', () => {
    const state = persisted([message(1)])

    expect(parsePersistedState(structuredClone(state))).toEqual(state)
  })

  it.each([
    ['null', null],
    ['строка', 'мусор'],
    ['без учётных данных', { chatId: CHAT_ID, threads: {} }],
    [
      'пустой токен',
      { credentials: { idInstance: '1101234567', apiTokenInstance: '' } },
    ],
  ])('отклоняет непригодное состояние: %s', (_name, value) => {
    expect(parsePersistedState(value)).toBeUndefined()
  })

  it('отбрасывает испорченные сообщения, но оставляет здоровые', () => {
    const raw = {
      ...persisted([]),
      threads: {
        [CHAT_ID]: [
          message(1),
          message(2, { timestamp: Number.NaN }),
          message(3, { status: 'weird' as Message['status'] }),
          message(4, { chatId: 'чужой@c.us' }),
          'не сообщение',
        ],
        битый: 'не массив',
      },
    }

    const state = parsePersistedState(JSON.parse(JSON.stringify(raw)))

    expect(state?.threads[CHAT_ID].map((item) => item.id)).toEqual(['ID1'])
    expect(state?.threads['битый']).toBeUndefined()
  })
})

describe('loadState / saveState', () => {
  it('возвращает то, что сохранили', () => {
    stubLocalStorage()
    const state = persisted([message(1), message(2)])
    saveState(state)

    expect(loadState()).toEqual(state)
  })

  it('битый JSON не роняет загрузку и очищает ключ', () => {
    const data = stubLocalStorage()
    data.set('messenger-inbox:v2', '{ не json')

    expect(loadState()).toBeUndefined()
    expect(data.size).toBe(0)
  })

  it('хранит только последние сообщения чата', () => {
    stubLocalStorage()
    saveState(persisted(manyMessages(600)))

    const loaded = loadState()
    expect(loaded?.threads[CHAT_ID]).toHaveLength(500)
    expect(loaded?.threads[CHAT_ID][499].id).toBe('ID599')
  })

  it('при переполнении хранилища повторяет запись с короткой историей', () => {
    const fiveHundred = JSON.stringify(persisted(manyMessages(500))).length
    stubLocalStorage(fiveHundred - 1)

    saveState(persisted(manyMessages(600)))

    expect(loadState()?.threads[CHAT_ID]).toHaveLength(100)
  })

  it('без localStorage работает молча', () => {
    vi.stubGlobal('localStorage', undefined)

    expect(() => saveState(persisted([]))).not.toThrow()
    expect(() => clearState()).not.toThrow()
    expect(loadState()).toBeUndefined()
  })
})
