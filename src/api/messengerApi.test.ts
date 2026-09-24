import { describe, expect, it } from 'vitest'
import { apiBaseUrl, instanceUrl } from './messengerApi'

const credentials = { idInstance: '1101234567', apiTokenInstance: 'tok123' }

describe('apiBaseUrl', () => {
  it('берёт хост по первым четырём цифрам idInstance', () => {
    expect(apiBaseUrl(credentials)).toBe('https://1101.api.green-api.com')
  })
})

describe('instanceUrl', () => {
  it('подставляет id и токен вокруг имени метода', () => {
    expect(instanceUrl(credentials, 'sendMessage')).toBe(
      'https://1101.api.green-api.com/waInstance1101234567/sendMessage/tok123',
    )
  })

  it('сохраняет хвост пути после токена', () => {
    expect(instanceUrl(credentials, 'deleteNotification/42')).toBe(
      'https://1101.api.green-api.com/waInstance1101234567/deleteNotification/tok123/42',
    )
  })

  it('экранирует символы, которые ломают путь', () => {
    const url = instanceUrl(
      { idInstance: '1101234567', apiTokenInstance: 'a/b?c' },
      'getStateInstance',
    )

    expect(url).toContain('/getStateInstance/a%2Fb%3Fc')
  })
})
