import { useState } from 'react'
import type { FormEvent } from 'react'
import { isAuthError } from '../../api/errors'
import { useLazyGetStateInstanceQuery } from '../../api/messengerApi'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { FormCard } from '../../shared/ui/FormCard'
import styles from '../../shared/ui/FormCard.module.css'
import { selectSessionError } from '../chat/selectors'
import { credentialsSet, sessionErrorDismissed } from './authSlice'

export function LoginForm() {
  const dispatch = useAppDispatch()
  const sessionError = useAppSelector(selectSessionError)
  const [checkInstance, { isFetching }] = useLazyGetStateInstanceQuery()
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    dispatch(sessionErrorDismissed())

    const credentials = {
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
    }
    if (!credentials.idInstance || !credentials.apiTokenInstance) {
      setError('Заполните оба поля')
      return
    }
    // Первые 4 цифры idInstance определяют хост API, так что это не придирка.
    if (!/^\d{4,}$/.test(credentials.idInstance)) {
      setError('idInstance — это число, например 1101234567')
      return
    }

    // Учётные данные попадают в стор только после проверки: форма остаётся на
    // экране и может показать причину отказа.
    try {
      const { stateInstance } = await checkInstance(credentials).unwrap()
      if (stateInstance !== 'authorized') {
        setError(`Инстанс не авторизован (состояние: ${stateInstance})`)
        return
      }
      dispatch(credentialsSet(credentials))
    } catch (failure) {
      setError(
        isAuthError(failure)
          ? 'API не принял idInstance или токен. Проверьте, что скопировали их полностью.'
          : 'Не удалось подключиться. Проверьте сеть, idInstance и токен.',
      )
    }
  }

  const shownError = error ?? sessionError

  return (
    <FormCard
      title="Вход"
      subtitle="Введите учётные данные вашего инстанса API."
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="idInstance">
            idInstance
          </label>
          <input
            id="idInstance"
            className={styles.input}
            value={idInstance}
            onChange={(event) => setIdInstance(event.target.value)}
            autoComplete="off"
            inputMode="numeric"
            placeholder="1101234567"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="apiTokenInstance">
            apiTokenInstance
          </label>
          <input
            id="apiTokenInstance"
            className={styles.input}
            value={apiTokenInstance}
            onChange={(event) => setApiTokenInstance(event.target.value)}
            autoComplete="off"
            placeholder="d75b3a66374942c5b3c019c698abc2067e151558acbd412345"
          />
          <span className={styles.hint}>
            Данные хранятся только в этом браузере.
          </span>
        </div>

        {shownError && (
          <p className={styles.error} role="alert">
            {shownError}
          </p>
        )}

        <button className={styles.submit} type="submit" disabled={isFetching}>
          {isFetching ? 'Проверяем…' : 'Подключиться'}
        </button>
      </form>
    </FormCard>
  )
}
