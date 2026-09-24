import { useEffect } from 'react'
import { messengerApi } from '../../api/messengerApi'
import { parseNotification } from '../../api/notifications'
import { useAppDispatch } from '../../app/hooks'
import {
  connectionStatusChanged,
  messageReceived,
  messageStatusChanged,
} from './chatSlice'

const INITIAL_BACKOFF_MS = 1000
const MAX_BACKOFF_MS = 15000

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}

/** Пока вкладка скрыта, опрос не ведём — ждём возвращения пользователя. */
function whenVisible(signal: AbortSignal): Promise<void> {
  if (document.visibilityState === 'visible') return Promise.resolve()

  return new Promise((resolve) => {
    function cleanup() {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      signal.removeEventListener('abort', onAbort)
    }
    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      cleanup()
      resolve()
    }
    function onAbort() {
      cleanup()
      resolve()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Длинный опрос очереди уведомлений.
 *
 * Каждое полученное уведомление обязательно удаляется из очереди, иначе API
 * пришлёт его снова. Ошибки сети не останавливают цикл: следующая попытка
 * идёт с экспоненциальной паузой, а в шапке чата появляется «соединение…».
 */
export function usePollNotifications(enabled: boolean): void {
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()
    const { signal } = controller
    let pending: { abort: () => void } | null = null
    let backoff = INITIAL_BACKOFF_MS

    async function poll() {
      while (!signal.aborted) {
        if (document.visibilityState === 'hidden') {
          await whenVisible(signal)
          continue
        }

        const request = dispatch(
          messengerApi.endpoints.receiveNotification.initiate(undefined, {
            subscribe: false,
            forceRefetch: true,
          }),
        )
        pending = request

        try {
          const notification = await request.unwrap()
          if (signal.aborted) return

          backoff = INITIAL_BACKOFF_MS
          dispatch(connectionStatusChanged('online'))

          if (notification) {
            const event = parseNotification(notification)
            if (event.kind === 'message') {
              dispatch(messageReceived(event.message))
            } else if (event.kind === 'status') {
              dispatch(
                messageStatusChanged({
                  idMessage: event.idMessage,
                  status: event.status,
                }),
              )
            }

            await dispatch(
              messengerApi.endpoints.deleteNotification.initiate(
                notification.receiptId,
              ),
            ).unwrap()
          }
        } catch {
          if (signal.aborted) return
          dispatch(connectionStatusChanged('reconnecting'))
          await delay(backoff, signal)
          backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
        } finally {
          pending = null
        }
      }
    }

    void poll()

    return () => {
      controller.abort()
      pending?.abort()
      dispatch(connectionStatusChanged('idle'))
    }
  }, [enabled, dispatch])
}
