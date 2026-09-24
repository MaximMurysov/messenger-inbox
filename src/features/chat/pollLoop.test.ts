import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ApiNotification } from '../../api/types'
import { createAppStore } from '../../app/store'
import { runPollLoop } from './pollLoop'
import type { PollTiming } from './pollLoop'

// Уведомление с этим receiptId «не разбирается»: имитируем неожиданный сбой.
vi.mock('../../api/notifications', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../api/notifications')>()
  return {
    ...actual,
    parseNotification: (notification: ApiNotification) => {
      if (notification.receiptId === 666) throw new Error('не разобрать')
      return actual.parseNotification(notification)
    },
  }
})

const CHAT_ID = '79991234567@c.us'
const FAST: PollTiming = {
  initialBackoffMs: 2,
  maxBackoffMs: 8,
  emptyPauseMs: 2,
}

type Step = () => Response | Promise<Response>

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

function incoming(receiptId: number, text = 'Привет'): ApiNotification {
  return {
    receiptId,
    body: {
      typeWebhook: 'incomingMessageReceived',
      timestamp: 1700000000,
      idMessage: `MSG${receiptId}`,
      senderData: { chatId: CHAT_ID },
      messageData: {
        typeMessage: 'textMessage',
        textMessageData: { textMessage: text },
      },
    },
  }
}

/** Как настоящий длинный запрос: висит, пока его не оборвут. */
function hang(signal: AbortSignal): Promise<Response> {
  return new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () =>
      reject(new DOMException('Aborted', 'AbortError')),
    )
  })
}

/**
 * Подменяет fetch: ответы на receiveNotification и deleteNotification берутся
 * из очередей; когда очередь receive кончилась, запрос повисает, как при пустой
 * очереди уведомлений, а deleteNotification отвечает успехом.
 */
function stubApi(steps: { receive: Step[]; remove?: Step[] }) {
  const calls: string[] = []
  const receive = [...steps.receive]
  const remove = [...(steps.remove ?? [])]

  vi.stubGlobal('fetch', async (request: Request) => {
    const { pathname } = new URL(request.url)
    calls.push(`${request.method} ${pathname}`)

    if (pathname.includes('/receiveNotification/')) {
      const step = receive.shift()
      return step ? step() : hang(request.signal)
    }
    if (pathname.includes('/deleteNotification/')) {
      const step = remove.shift()
      return step ? step() : json({ result: true })
    }
    return json({}, 404)
  })

  return {
    calls,
    deletes: () => calls.filter((call) => call.startsWith('DELETE')),
    receives: () =>
      calls.filter((call) => call.includes('/receiveNotification/')),
  }
}

function startLoop() {
  const store = createAppStore({
    credentials: { idInstance: '1101234567', apiTokenInstance: 'tok' },
    chatId: CHAT_ID,
    threads: {},
  })
  const controller = new AbortController()
  const done = runPollLoop(store.dispatch, controller.signal, FAST)
  const stop = async () => {
    controller.abort()
    await done
  }
  const texts = () =>
    (store.getState().chat.threads[CHAT_ID] ?? []).map((item) => item.text)
  return { store, done, stop, texts }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('runPollLoop', () => {
  it('кладёт сообщение в ленту и удаляет уведомление из очереди', async () => {
    const api = stubApi({ receive: [() => json(incoming(7, 'Здравствуйте'))] })
    const loop = startLoop()

    await vi.waitFor(() => expect(api.deletes()).toHaveLength(1))
    await loop.stop()

    expect(loop.texts()).toEqual(['Здравствуйте'])
    expect(api.deletes()[0]).toMatch(/\/deleteNotification\/tok\/7$/)
  })

  it('удаляет и то уведомление, которое не удалось разобрать', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const api = stubApi({
      receive: [() => json(incoming(666)), () => json(incoming(8, 'Дальше'))],
    })
    const loop = startLoop()

    await vi.waitFor(() => expect(api.deletes()).toHaveLength(2))
    await loop.stop()

    expect(api.deletes()[0]).toMatch(/\/deleteNotification\/tok\/666$/)
    expect(loop.texts()).toEqual(['Дальше'])
  })

  it('переживает сетевой сбой: сообщает о потере связи и продолжает', async () => {
    const api = stubApi({
      receive: [
        () => {
          throw new TypeError('Failed to fetch')
        },
        () => json(incoming(9, 'После сбоя')),
      ],
    })
    const loop = startLoop()
    const seen: string[] = []
    loop.store.subscribe(() => seen.push(loop.store.getState().chat.connection))

    await vi.waitFor(() => expect(api.deletes()).toHaveLength(1))
    await loop.stop()

    expect(seen).toContain('reconnecting')
    expect(seen).toContain('online')
    expect(loop.texts()).toEqual(['После сбоя'])
  })

  it('401 завершает цикл и возвращает на экран входа с причиной', async () => {
    const api = stubApi({ receive: [() => json({}, 401)] })
    const loop = startLoop()

    await loop.done

    const { auth } = loop.store.getState()
    expect(auth.credentials).toBeNull()
    expect(auth.sessionError).toMatch(/idInstance или токен/)
    expect(api.receives()).toHaveLength(1)
  })

  it('если удаление не удалось, повторное уведомление не задваивает сообщение', async () => {
    const api = stubApi({
      receive: [() => json(incoming(10)), () => json(incoming(10))],
      remove: [() => json({}, 500)],
    })
    const loop = startLoop()

    await vi.waitFor(() => expect(api.deletes()).toHaveLength(2))
    await loop.stop()

    expect(loop.texts()).toEqual(['Привет'])
  })

  it('после пустого ответа делает паузу, а не крутится вхолостую', async () => {
    const api = stubApi({
      receive: Array.from({ length: 200 }, () => () => json(null)),
    })
    const loop = startLoop()

    await new Promise((resolve) => setTimeout(resolve, 60))
    await loop.stop()

    // Без паузы за 60 мс набралась бы вся сотня-другая ответов.
    expect(api.receives().length).toBeGreaterThan(1)
    expect(api.receives().length).toBeLessThan(60)
  })

  it('отмена обрывает висящий запрос и больше ничего не запрашивает', async () => {
    const api = stubApi({ receive: [] })
    const loop = startLoop()

    await vi.waitFor(() => expect(api.receives()).toHaveLength(1))
    await loop.stop()
    const callsAtStop = api.calls.length
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(api.calls).toHaveLength(callsAtStop)
  })

  it('отмена до первого запроса не отправляет ничего', async () => {
    const api = stubApi({ receive: [] })
    const loop = startLoop()

    await loop.stop()

    expect(api.calls).toEqual([])
  })
})
