import { ChatHeader } from './ChatHeader'
import styles from './ChatScreen.module.css'
import { MessageInput } from './MessageInput'
import { MessageList } from './MessageList'
import { usePollNotifications } from './usePollNotifications'
import { useSendMessage } from './useSendMessage'

export function ChatScreen() {
  const { send, retry } = useSendMessage()
  usePollNotifications(true)

  return (
    <div className={styles.screen}>
      <div className={styles.window}>
        <ChatHeader />
        <MessageList onRetry={retry} />
        <MessageInput onSend={send} />
      </div>
    </div>
  )
}
