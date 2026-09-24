import { formatTime } from '../../shared/time'
import styles from './MessageBubble.module.css'
import type { Message } from './types'

/** Часы — сообщение ещё уходит, одна галочка — доставлено серверу, две — получателю. */
function StatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'pending') {
    return (
      <svg
        className={styles.tick}
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        aria-label="отправляется"
      >
        <circle cx="8" cy="8" r="6" />
        <path d="M8 4.8V8l2.2 1.4" />
      </svg>
    )
  }

  if (status === 'failed') return null

  const isDouble = status === 'delivered' || status === 'read'
  return (
    <svg
      className={`${styles.tick} ${status === 'read' ? styles.read : ''}`}
      width="16"
      height="12"
      viewBox="0 0 18 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={status === 'read' ? 'прочитано' : 'отправлено'}
    >
      <path d="M1 6.5 4.2 9.8 10.5 2.4" />
      {isDouble && <path d="M7 9.4 12.9 2.4" />}
    </svg>
  )
}

export function MessageBubble({
  message,
  onRetry,
}: {
  message: Message
  onRetry: (message: Message) => void
}) {
  const isOut = message.direction === 'out'

  return (
    <div className={`${styles.row} ${isOut ? styles.out : styles.in}`}>
      <div className={styles.bubble}>
        <div className={styles.text}>{message.text}</div>

        <div className={styles.meta}>
          <span>{formatTime(message.timestamp)}</span>
          {isOut && <StatusIcon status={message.status} />}
        </div>

        {message.status === 'failed' && (
          <div className={styles.failedNote}>
            <span>Не отправлено</span>
            <button
              className={styles.retry}
              type="button"
              onClick={() => onRetry(message)}
            >
              Повторить
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
