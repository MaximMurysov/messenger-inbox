import { useAppSelector } from './app/hooks'
import { LoginForm } from './features/auth/LoginForm'
import { ChatScreen } from './features/chat/ChatScreen'
import { NewChatForm } from './features/chat/NewChatForm'
import { selectChatId, selectCredentials } from './features/chat/selectors'

export default function App() {
  const credentials = useAppSelector(selectCredentials)
  const chatId = useAppSelector(selectChatId)

  if (!credentials) return <LoginForm />
  if (!chatId) return <NewChatForm />
  return <ChatScreen />
}
