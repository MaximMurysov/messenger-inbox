import type { Credentials } from '../api/types'
import type { Message } from '../features/chat/types'

const STORAGE_KEY = 'messenger-inbox:v1'

export type PersistedState = {
  credentials: Credentials | null
  chat: {
    chatId: string | null
    phone: string | null
    messages: Message[]
  }
}

export function loadState(): PersistedState | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedState) : undefined
  } catch {
    return undefined
  }
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Приватный режим или переполненное хранилище — работаем без сохранения.
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // см. выше
  }
}
