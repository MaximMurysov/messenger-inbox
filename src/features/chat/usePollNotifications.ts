import { useEffect } from 'react'
import { useAppDispatch } from '../../app/hooks'
import { connectionStatusChanged } from './chatSlice'
import { runPollLoop } from './pollLoop'

/** Ведёт длинный опрос уведомлений, пока смонтирован компонент. */
export function usePollNotifications(): void {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const controller = new AbortController()
    void runPollLoop(dispatch, controller.signal)

    return () => {
      controller.abort()
      dispatch(connectionStatusChanged('idle'))
    }
  }, [dispatch])
}
