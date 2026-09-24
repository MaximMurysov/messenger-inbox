import { useEffect, useRef } from 'react'
import { useAppSelector } from '../../app/hooks'
import { formatDaySeparator, isSameDay } from '../../shared/time'
import { MessageBubble } from './MessageBubble'
import styles from './MessageList.module.css'
import { selectMessages } from './selectors'
import type { Message } from './types'

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
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className={styles.list}>
        <div className={styles.empty}>
          Сообщений пока нет.
          <br />
          Напишите первым — сообщение уйдёт в WhatsApp получателю.
        </div>
      </div>
    )
  }

  return (
    <div className={styles.list}>
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
      <div ref={bottomRef} />
    </div>
  )
}
