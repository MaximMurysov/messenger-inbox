/** Номер телефона в виде одних только цифр, например "79991234567". */
export type PhoneDigits = string

/** Убирает всё, кроме цифр, и приводит российские номера с 8 к формату с 7. */
export function normalizePhone(input: string): PhoneDigits {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('8')) {
    return `7${digits.slice(1)}`
  }
  return digits
}

/** Международные номера — от 10 до 15 цифр (E.164). */
export function isValidPhone(digits: PhoneDigits): boolean {
  return /^\d{10,15}$/.test(digits)
}

/** Идентификатор личного чата в формате API. */
export function toChatId(digits: PhoneDigits): string {
  return `${digits}@c.us`
}

/** Обратное преобразование: из chatId получить номер для показа в шапке. */
export function chatIdToPhone(chatId: string): PhoneDigits {
  return chatId.replace(/@.*$/, '')
}

/** Человекочитаемый вид номера: +7 999 123-45-67. */
export function formatPhone(digits: PhoneDigits): string {
  if (digits.length === 11 && digits.startsWith('7')) {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(
      7,
      9,
    )}-${digits.slice(9)}`
  }
  return `+${digits}`
}
