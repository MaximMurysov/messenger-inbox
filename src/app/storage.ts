import type { Credentials } from '../api/types'
import type { Message } from '../features/chat/types'

const STORAGE_KEY = 'messenger-inbox:v2'

/** Сколько последних сообщений каждого чата кладём в хранилище. */
const MAX_MESSAGES_PER_CHAT = 500
/** Если хранилище переполнено, пробуем ещё раз с укороченной историей. */
const MAX_MESSAGES_ON_QUOTA = 100

export type PersistedState = {
  credentials: Credentials
  chatId: string | null
  threads: Record<string, Message[]>
}

const MESSAGE_STATUSES = ['pending', 'sent', 'delivered', 'read', 'failed']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCredentials(value: unknown): value is Credentials {
  return (
    isRecord(value) &&
    typeof value.idInstance === 'string' &&
    typeof value.apiTokenInstance === 'string' &&
    value.idInstance !== '' &&
    value.apiTokenInstance !== ''
  )
}

function isMessage(value: unknown, chatId: string): value is Message {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.chatId === chatId &&
    typeof value.text === 'string' &&
    (value.direction === 'in' || value.direction === 'out') &&
    typeof value.timestamp === 'number' &&
    Number.isFinite(value.timestamp) &&
    typeof value.status === 'string' &&
    MESSAGE_STATUSES.includes(value.status)
  )
}

/**
 * Приводит то, что лежало в хранилище, к нашей форме. Испорченные сообщения
 * отбрасываются, а если непригодно всё целиком — возвращается undefined:
 * приложение стартует с экрана входа, а не падает на битых данных.
 */
export function parsePersistedState(
  value: unknown,
): PersistedState | undefined {
  if (!isRecord(value) || !isCredentials(value.credentials)) return undefined

  const threads: Record<string, Message[]> = {}
  if (isRecord(value.threads)) {
    for (const [chatId, items] of Object.entries(value.threads)) {
      if (!Array.isArray(items)) continue
      threads[chatId] = items.filter((item): item is Message =>
        isMessage(item, chatId),
      )
    }
  }

  const chatId = typeof value.chatId === 'string' ? value.chatId : null
  return { credentials: value.credentials, chatId, threads }
}

export function loadState(): PersistedState | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined

    const state = parsePersistedState(JSON.parse(raw))
    if (!state) clearState()
    return state
  } catch {
    clearState()
    return undefined
  }
}

function trimThreads(
  threads: PersistedState['threads'],
  limit: number,
): PersistedState['threads'] {
  return Object.fromEntries(
    Object.entries(threads).map(([chatId, items]) => [
      chatId,
      items.slice(-limit),
    ]),
  )
}

export function saveState(state: PersistedState): void {
  for (const limit of [MAX_MESSAGES_PER_CHAT, MAX_MESSAGES_ON_QUOTA]) {
    try {
      const trimmed = { ...state, threads: trimThreads(state.threads, limit) }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
      return
    } catch {
      // Приватный режим или переполненное хранилище — пробуем короче,
      // а если и так не выходит, работаем без сохранения.
    }
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // см. выше
  }
}
