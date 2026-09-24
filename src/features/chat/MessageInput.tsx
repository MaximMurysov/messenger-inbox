import { useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import styles from './MessageInput.module.css'

const MAX_HEIGHT_PX = 120

export function MessageInput({
  onSend,
}: {
  onSend: (text: string) => void | Promise<void>
}) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Высота поля растёт вместе с текстом, но не бесконечно.
  useLayoutEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT_PX)}px`
  }, [text])

  function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!text.trim()) return
    void onSend(text)
    setText('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form className={styles.bar} onSubmit={submit}>
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Введите сообщение"
        rows={1}
        aria-label="Текст сообщения"
      />
      <button
        className={styles.send}
        type="submit"
        disabled={!text.trim()}
        aria-label="Отправить"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.3 21.4 23 12 2.3 2.6 2.3 10l14.9 2-14.9 2z" />
        </svg>
      </button>
    </form>
  )
}
