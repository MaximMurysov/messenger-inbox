import { Component } from 'react'
import type { ReactNode } from 'react'
import { clearState } from '../../app/storage'
import { FormCard } from './FormCard'
import styles from './FormCard.module.css'

type Props = { children: ReactNode }
type State = { failed: boolean }

/**
 * Последняя линия обороны: если рендер упал (например, на испорченных
 * данных), вместо белого экрана предлагаем сбросить локальные данные.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  private reset = () => {
    clearState()
    window.location.reload()
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <FormCard
        title="Что-то пошло не так"
        subtitle="Приложение не смогло отобразить экран. Если перезагрузка не помогает, сбросьте сохранённые данные — придётся войти заново."
      >
        <div className={styles.form}>
          <button
            className={styles.submit}
            type="button"
            onClick={() => window.location.reload()}
          >
            Перезагрузить
          </button>
          <button className={styles.link} type="button" onClick={this.reset}>
            Сбросить данные и перезагрузить
          </button>
        </div>
      </FormCard>
    )
  }
}
