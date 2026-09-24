import { useEffect, useRef } from 'react'
import { isAuthError } from '../../api/errors'
import { messengerApi } from '../../api/messengerApi'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { selectCredentials } from '../chat/selectors'
import { SESSION_INVALID_MESSAGE, sessionExpired } from './authSlice'

/**
 * Учётные данные, поднятые из localStorage, проверяем один раз при старте:
 * пока вкладка была закрыта, инстанс мог разлогиниться. Сетевой сбой сессию
 * не сбрасывает — только явный отказ API.
 */
export function useVerifyRestoredSession(): void {
  const dispatch = useAppDispatch()
  // Нас интересуют только данные, что были в сторе на старте; после входа
  // через форму они уже проверены.
  const restored = useRef(useAppSelector(selectCredentials))

  useEffect(() => {
    const credentials = restored.current
    if (!credentials) return

    let cancelled = false
    dispatch(
      messengerApi.endpoints.getStateInstance.initiate(credentials, {
        subscribe: false,
        forceRefetch: true,
      }),
    )
      .unwrap()
      .then(({ stateInstance }) => {
        if (!cancelled && stateInstance === 'notAuthorized') {
          dispatch(sessionExpired('Инстанс больше не авторизован в WhatsApp.'))
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && isAuthError(error)) {
          dispatch(sessionExpired(SESSION_INVALID_MESSAGE))
        }
      })

    return () => {
      cancelled = true
    }
  }, [dispatch])
}
