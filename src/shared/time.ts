const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
})

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
})

/** Время в углу баббла: 14:05. */
export function formatTime(timestamp: number): string {
  return timeFormatter.format(timestamp)
}

/** Подпись разделителя дней в ленте. */
export function formatDaySeparator(timestamp: number): string {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (isSameDay(date, today)) return 'Сегодня'
  if (isSameDay(date, yesterday)) return 'Вчера'
  return dateFormatter.format(date)
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
