import { isAuthError } from '../../api/errors'
import { messengerApi } from '../../api/messengerApi'
import { parseNotification } from '../../api/notifications'
import type { ApiNotification } from '../../api/types'
import type { AppDispatch } from '../../app/store'
import { SESSION_INVALID_MESSAGE, sessionExpired } from '../auth/authSlice'
import {
  apiEchoReceived,
  connectionStatusChanged,
  messageReceived,
  messageStatusChanged,
} from './chatSlice'

export type PollTiming = {
  initialBackoffMs: number
  maxBackoffMs: number
  /** Пауза после пустого ответа: страховка от горячего цикла. */
  emptyPauseMs: number
}

export const DEFAULT_TIMING: PollTiming = {
  initialBackoffMs: 1000,
  maxBackoffMs: 15000,
  emptyPauseMs: 300,
}

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

function isHidden(): boolean {
  return (
    typeof document !== 'undefined' && document.visibilityState === 'hidden'
  )
}

/** Пока вкладка скрыта, опрос не ведём — ждём возвращения пользователя. */
function whenVisible(signal: AbortSignal): Promise<void> {
  if (!isHidden()) return Promise.resolve()

  return new Promise((resolve) => {
    function cleanup() {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      signal.removeEventListener('abort', onAbort)
    }
    function onVisibilityChange() {
      if (isHidden()) return
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
 * Применяет уведомление к ленте. Не бросает: неразобранное уведомление
 * пропускаем, чтобы его всё равно удалили из очереди, а не застряли на нём.
 */
function applyNotification(
  dispatch: AppDispatch,
  notification: ApiNotification,
) {
  try {
    const event = parseNotification(notification)
    if (event.kind === 'message') {
      dispatch(
        event.sentViaApi
          ? apiEchoReceived(event.message)
          : messageReceived(event.message),
      )
    } else if (event.kind === 'status') {
      dispatch(
        messageStatusChanged({
          idMessage: event.idMessage,
          status: event.status,
        }),
      )
    }
  } catch (error) {
    console.warn('Не удалось разобрать уведомление, пропускаем', error)
  }
}

/**
 * Длинный опрос очереди уведомлений до отмены сигнала.
 *
 * Ошибки делятся на три рода:
 * - сеть и прочие сбои API — пауза с удвоением и новая попытка;
 * - 401/403 — учётные данные больше не годятся, цикл завершается выходом на
 *   экран входа с объяснением;
 * - уведомление, которое не удалось разобрать, — пропускается, но
 *   DeleteNotification вызывается всегда, иначе очередь встанет навсегда.
 */
export async function runPollLoop(
  dispatch: AppDispatch,
  signal: AbortSignal,
  timing: PollTiming = DEFAULT_TIMING,
): Promise<void> {
  let backoff = timing.initialBackoffMs

  async function retryLater() {
    dispatch(connectionStatusChanged('reconnecting'))
    await delay(backoff, signal)
    backoff = Math.min(backoff * 2, timing.maxBackoffMs)
  }

  // Даём эффекту шанс отмениться до первого запроса: StrictMode сразу же
  // размонтирует и монтирует хук заново, а два запроса с одним ключом RTK
  // Query склеивает — второй из них падал бы ложной «потерей соединения».
  await delay(0, signal)

  while (!signal.aborted) {
    if (isHidden()) {
      await whenVisible(signal)
      continue
    }

    const request = dispatch(
      messengerApi.endpoints.receiveNotification.initiate(undefined, {
        subscribe: false,
        forceRefetch: true,
      }),
    )
    const abortRequest = () => request.abort()
    signal.addEventListener('abort', abortRequest, { once: true })

    let notification: ApiNotification | null
    try {
      notification = await request.unwrap()
    } catch (error) {
      if (signal.aborted) return
      if (isAuthError(error)) {
        dispatch(sessionExpired(SESSION_INVALID_MESSAGE))
        return
      }
      await retryLater()
      continue
    } finally {
      signal.removeEventListener('abort', abortRequest)
    }
    if (signal.aborted) return

    backoff = timing.initialBackoffMs
    dispatch(connectionStatusChanged('online'))

    if (!notification) {
      await delay(timing.emptyPauseMs, signal)
      continue
    }

    applyNotification(dispatch, notification)

    try {
      await dispatch(
        messengerApi.endpoints.deleteNotification.initiate(
          notification.receiptId,
          { track: false },
        ),
      ).unwrap()
    } catch (error) {
      if (signal.aborted) return
      if (isAuthError(error)) {
        dispatch(sessionExpired(SESSION_INVALID_MESSAGE))
        return
      }
      // Уведомление осталось в очереди и придёт снова — дубль отсечёт слайс.
      await retryLater()
    }
  }
}
