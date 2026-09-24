import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAppDispatch } from '../../app/hooks'
import { isValidPhone, normalizePhone, toChatId } from '../../shared/phone'
import { FormCard } from '../../shared/ui/FormCard'
import styles from '../../shared/ui/FormCard.module.css'
import { loggedOut } from '../auth/authSlice'
import { chatOpened } from './chatSlice'

export function NewChatForm() {
  const dispatch = useAppDispatch()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const digits = normalizePhone(phone)
    if (!isValidPhone(digits)) {
      setError('Введите номер в международном формате, например 79991234567')
      return
    }

    setError(null)
    dispatch(chatOpened(toChatId(digits)))
  }

  return (
    <FormCard
      title="Новый чат"
      subtitle="Введите номер телефона получателя в WhatsApp."
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="phone">
            Номер телефона
          </label>
          <input
            id="phone"
            className={styles.input}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 999 123-45-67"
          />
          <span className={styles.hint}>
            Номер с кодом страны, без пробелов и знаков — можно как удобно.
          </span>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.submit} type="submit">
          Начать чат
        </button>

        <button
          className={styles.link}
          type="button"
          onClick={() => dispatch(loggedOut())}
        >
          Сменить учётные данные
        </button>
      </form>
    </FormCard>
  )
}
