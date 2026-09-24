import { useCallback } from 'react'
import { useSendMessageMutation } from '../../api/messengerApi'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import {
  messageFailed,
  messageQueued,
  messageRemoved,
  messageSent,
} from './chatSlice'
import { selectChatId } from './selectors'
import type { Message } from './types'

function createLocalId(): string {
  return `local-${crypto.randomUUID()}`
}

/**
 * Отправка текста: сообщение появляется в ленте сразу со статусом «pending»,
 * а по ответу API получает настоящий idMessage либо помечается ошибкой.
 */
export function useSendMessage() {
  const dispatch = useAppDispatch()
  const chatId = useAppSelector(selectChatId)
  const [sendMessage, { isLoading }] = useSendMessageMutation()

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

      try {
        const { idMessage } = await sendMessage({ chatId, message }).unwrap()
        dispatch(messageSent({ localId, idMessage }))
      } catch {
        dispatch(messageFailed(localId))
      }
    },
    [chatId, dispatch, sendMessage],
  )

  const retry = useCallback(
    (failed: Message) => {
      dispatch(messageRemoved(failed.id))
      return send(failed.text)
    },
    [dispatch, send],
  )

  return { send, retry, isSending: isLoading }
}
