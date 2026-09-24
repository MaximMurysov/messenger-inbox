export type MessageDirection = 'in' | 'out'

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export type Message = {
  /** idMessage из API, а для ещё не отправленных — локальный идентификатор. */
  id: string
  chatId: string
  text: string
  direction: MessageDirection
  /** Время в миллисекундах. */
  timestamp: number
  status: MessageStatus
}

export type ConnectionStatus = 'idle' | 'online' | 'reconnecting'
