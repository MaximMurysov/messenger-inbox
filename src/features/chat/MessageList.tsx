import { useEffect, useRef } from 'react'
import { useAppSelector } from '../../app/hooks'
import { formatDaySeparator, isSameDay } from '../../shared/time'
import { MessageBubble } from './MessageBubble'
import styles from './MessageList.module.css'
import { selectMessages } from './selectors'
import type { Message } from './types'

/** Ближе этого к низу считаем, что читатель «внизу» ленты. */
const STICK_THRESHOLD_PX = 80

function needsDaySeparator(current: Message, previous: Message | undefined) {
  if (!previous) return true
  return !isSameDay(new Date(current.timestamp), new Date(previous.timestamp))
}

export function MessageList({
  onRetry,
}: {
  onRetry: (message: Message) => void
}) {
  const messages = useAppSelector(selectMessages)
  const listRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  function handleScroll() {
    const list = listRef.current
    if (!list) return
    const distance = list.scrollHeight - list.scrollTop - list.clientHeight
    stickToBottom.current = distance < STICK_THRESHOLD_PX
  }

  // Как в WhatsApp: ленту тянет вниз, только если читатель уже внизу или
  // сам написал. Тому, кто листает историю, входящее её не сбивает.
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const last = messages[messages.length - 1]
    if (stickToBottom.current || last?.direction === 'out') {
      list.scrollTop = list.scrollHeight
      stickToBottom.current = true
    }
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className={styles.list} ref={listRef}>
        <div className={styles.empty}>
          Сообщений пока нет.
          <br />
          Напишите первым — сообщение уйдёт в WhatsApp получателю.
        </div>
      </div>
    )
  }

  return (
    <div
      className={styles.list}
      ref={listRef}
      onScroll={handleScroll}
      role="log"
      aria-live="polite"
      aria-label="Переписка"
    >
      {messages.map((message, index) => (
        <div key={message.id}>
          {needsDaySeparator(message, messages[index - 1]) && (
            <div className={styles.daySeparator}>
              <span>{formatDaySeparator(message.timestamp)}</span>
            </div>
          )}
          <MessageBubble message={message} onRetry={onRetry} />
        </div>
      ))}
    </div>
  )
}
