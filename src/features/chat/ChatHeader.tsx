import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { formatPhone } from '../../shared/phone'
import { loggedOut } from '../auth/authSlice'
import styles from './ChatHeader.module.css'
import { chatClosed } from './chatSlice'
import { selectConnection, selectPhone } from './selectors'

const STATUS_LABEL = {
  idle: 'подключение…',
  online: 'на связи',
  reconnecting: 'соединение потеряно, пробуем снова…',
} as const

export function ChatHeader() {
  const dispatch = useAppDispatch()
  const phone = useAppSelector(selectPhone)
  const connection = useAppSelector(selectConnection)

  return (
    <header className={styles.header}>
      <div className={styles.avatar} aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
        </svg>
      </div>

      <div className={styles.info}>
        <div className={styles.name}>{phone ? formatPhone(phone) : ''}</div>
        <div className={styles.status}>{STATUS_LABEL[connection]}</div>
      </div>

      <button
        className={styles.action}
        type="button"
        onClick={() => dispatch(chatClosed())}
      >
        Другой чат
      </button>
      <button
        className={styles.action}
        type="button"
        onClick={() => dispatch(loggedOut())}
      >
        Выйти
      </button>
    </header>
  )
}
