import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLazyGetStateInstanceQuery } from '../../api/messengerApi'
import { useAppDispatch } from '../../app/hooks'
import { FormCard } from '../../shared/ui/FormCard'
import styles from '../../shared/ui/FormCard.module.css'
import { credentialsSet, loggedOut } from './authSlice'

export function LoginForm() {
  const dispatch = useAppDispatch()
  const [checkInstance, { isFetching }] = useLazyGetStateInstanceQuery()
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const credentials = {
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
    }
    if (!credentials.idInstance || !credentials.apiTokenInstance) {
      setError('Заполните оба поля')
      return
    }

    // Запросы берут учётные данные из стора, поэтому сначала сохраняем их,
    // а потом проверяем — при неудаче откатываем.
    dispatch(credentialsSet(credentials))
    try {
      const { stateInstance } = await checkInstance().unwrap()
      if (stateInstance !== 'authorized') {
        dispatch(loggedOut())
        setError(`Инстанс не авторизован (состояние: ${stateInstance})`)
      }
    } catch {
      dispatch(loggedOut())
      setError('Не удалось подключиться. Проверьте idInstance и токен.')
    }
  }

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

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.submit} type="submit" disabled={isFetching}>
          {isFetching ? 'Проверяем…' : 'Подключиться'}
        </button>
      </form>
    </FormCard>
  )
}
