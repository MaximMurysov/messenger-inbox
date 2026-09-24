import { describe, expect, it } from 'vitest'
import {
  chatIdToPhone,
  formatPhone,
  isValidPhone,
  normalizePhone,
  toChatId,
} from './phone'

describe('normalizePhone', () => {
  it('оставляет только цифры', () => {
    expect(normalizePhone('+7 (999) 123-45-67')).toBe('79991234567')
  })

  it('приводит российский номер с 8 к формату с 7', () => {
    expect(normalizePhone('8 999 123 45 67')).toBe('79991234567')
  })

  it('не трогает номера других стран', () => {
    expect(normalizePhone('+1 202 555 0143')).toBe('12025550143')
  })
})

describe('isValidPhone', () => {
  it('принимает международные номера', () => {
    expect(isValidPhone('79991234567')).toBe(true)
  })

  it('отклоняет слишком короткие и пустые', () => {
    expect(isValidPhone('12345')).toBe(false)
    expect(isValidPhone('')).toBe(false)
  })
})

describe('chatId', () => {
  it('преобразует номер в идентификатор чата и обратно', () => {
    expect(toChatId('79991234567')).toBe('79991234567@c.us')
    expect(chatIdToPhone('79991234567@c.us')).toBe('79991234567')
  })
})

describe('formatPhone', () => {
  it('форматирует российский номер', () => {
    expect(formatPhone('79991234567')).toBe('+7 999 123-45-67')
  })

  it('прочие номера показывает с плюсом', () => {
    expect(formatPhone('12025550143')).toBe('+12025550143')
  })
})
