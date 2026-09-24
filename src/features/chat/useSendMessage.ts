import { useCallback } from 'react'
import { useSendMessageMutation } from '../../api/messengerApi'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import {
  messageFailed,
  messageQueued,
  messageRetrying,
  messageSent,
} from './chatSlice'
import { selectChatId } from './selectors'
import { LOCAL_ID_PREFIX } from './types'
import type { Message } from './types'

function createLocalId(): string {
  return `${LOCAL_ID_PREFIX}${crypto.randomUUID()}`
}

/**
 * Отправка текста: сообщение появляется в ленте сразу со статусом «pending»,
 * а по ответу API получает настоящий idMessage либо помечается ошибкой.
 */
export function useSendMessage() {
  const dispatch = useAppDispatch()
  const chatId = useAppSelector(selectChatId)
  const [sendMessage] = useSendMessageMutation()

  const deliver = useCallback(
    async (targetChatId: string, localId: string, text: string) => {
      try {
        const { idMessage } = await sendMessage({
          chatId: targetChatId,
          message: text,
        }).unwrap()
        dispatch(messageSent({ chatId: targetChatId, localId, idMessage }))
      } catch {
        dispatch(messageFailed({ chatId: targetChatId, id: localId }))
      }
    },
    [dispatch, sendMessage],
  )

  const send = useCallback(
    async (text: string) => {
      const message = text.trim()
      if (!message || !chatId) return

      const localId = createLocalId()
      dispatch(
        messageQueued({
          id: localId,
          chatId,
          text: message,
          direction: 'out',
          timestamp: Date.now(),
          status: 'pending',
        }),
      )
      await deliver(chatId, localId, message)
    },
    [chatId, deliver, dispatch],
  )

  /** Повтор не пересоздаёт сообщение: оно остаётся на своём месте в ленте. */
  const retry = useCallback(
    (failed: Message) => {
      dispatch(messageRetrying({ chatId: failed.chatId, id: failed.id }))
      return deliver(failed.chatId, failed.id, failed.text)
    },
    [deliver, dispatch],
  )

  return { send, retry }
}
