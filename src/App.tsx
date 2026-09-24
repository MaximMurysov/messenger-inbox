import { useAppSelector } from './app/hooks'
import { useVerifyRestoredSession } from './features/auth/useVerifyRestoredSession'
import { LoginForm } from './features/auth/LoginForm'
import { ChatScreen } from './features/chat/ChatScreen'
import { NewChatForm } from './features/chat/NewChatForm'
import { selectChatId, selectCredentials } from './features/chat/selectors'

export default function App() {
  const credentials = useAppSelector(selectCredentials)
  const chatId = useAppSelector(selectChatId)
  useVerifyRestoredSession()

  if (!credentials) return <LoginForm />
  if (!chatId) return <NewChatForm />
  return <ChatScreen />
}
