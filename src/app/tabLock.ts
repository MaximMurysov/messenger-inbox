const LOCK_NAME = 'messenger-inbox:tab'

/** Замок держится, пока жива вкладка: его отпускает закрытие страницы. */
const forever = () => new Promise<void>(() => {})

function lockManager(): LockManager | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.locks
}

/**
 * Две вкладки опрашивали бы одну очередь уведомлений и затирали бы историю
 * друг друга в localStorage, поэтому работает только одна. Возвращает false,
 * если приложение уже открыто в другой вкладке. Без Web Locks не мешаем.
 */
export function claimTab(): Promise<boolean> {
  const locks = lockManager()
  if (!locks) return Promise.resolve(true)

  return new Promise((resolve) => {
    void locks.request(LOCK_NAME, { ifAvailable: true }, (lock) => {
      resolve(lock !== null)
      return lock ? forever() : undefined
    })
  })
}

/**
 * Вторая вкладка ждёт, пока первую закроют, и перезагружается: её состояние
 * устарело, а свежее лежит в localStorage. Замок при этом не отпускаем до
 * выгрузки страницы, чтобы его не перехватила третья вкладка.
 */
export function reloadWhenTabFree(): void {
  void lockManager()?.request(LOCK_NAME, () => {
    window.location.reload()
    return forever()
  })
}
