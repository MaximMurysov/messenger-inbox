import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query'
import type { RootState } from '../app/store'
import type {
  ApiNotification,
  Credentials,
  DeleteNotificationResponse,
  SendMessageRequest,
  SendMessageResponse,
} from './types'

/**
 * Хост инстанса GREEN-API: https://{первые 4 цифры idInstance}.api.green-api.com.
 * Перекрывается переменной окружения VITE_API_BASE_URL.
 */
export function apiBaseUrl(credentials: Credentials): string {
  const override = import.meta.env.VITE_API_BASE_URL
  if (override) return override.replace(/\/$/, '')
  return `https://${credentials.idInstance.slice(0, 4)}.api.green-api.com`
}

/** Сколько секунд API держит открытым запрос за входящими уведомлениями. */
export const RECEIVE_TIMEOUT_SECONDS = 20

/**
 * Собирает адрес вида {хост}/waInstance{id}/{метод}/{токен}/{хвост}.
 * Единственное место, где учётные данные попадают в URL.
 */
export function instanceUrl(credentials: Credentials, url: string): string {
  const [method, ...rest] = url.split('/')
  const suffix = rest.length > 0 ? `/${rest.join('/')}` : ''
  const id = encodeURIComponent(credentials.idInstance)
  const token = encodeURIComponent(credentials.apiTokenInstance)
  return `${apiBaseUrl(credentials)}/waInstance${id}/${method}/${token}${suffix}`
}

/**
 * Запрос к API. Обычно учётные данные берутся из стора, но при входе их ещё
 * там нет — тогда экран входа передаёт их явно в поле instance.
 */
export type ApiRequest = FetchArgs & { instance?: Credentials }

const rawBaseQuery = fetchBaseQuery({ baseUrl: '/' })

const baseQueryWithCredentials: BaseQueryFn<
  string | ApiRequest,
  unknown,
  FetchBaseQueryError
> = (args, api, extraOptions) => {
  const request: ApiRequest = typeof args === 'string' ? { url: args } : args
  const { instance, ...fetchArgs } = request
  const credentials = instance ?? (api.getState() as RootState).auth.credentials
  if (!credentials) {
    return {
      error: {
        status: 401,
        data: 'Не заданы учётные данные API',
      } satisfies FetchBaseQueryError,
    }
  }

  return rawBaseQuery(
    { ...fetchArgs, url: instanceUrl(credentials, fetchArgs.url) },
    api,
    extraOptions,
  )
}

export const messengerApi = createApi({
  reducerPath: 'messengerApi',
  baseQuery: baseQueryWithCredentials,
  endpoints: (build) => ({
    sendMessage: build.mutation<SendMessageResponse, SendMessageRequest>({
      query: (body) => ({ url: 'sendMessage', method: 'POST', body }),
    }),

    /**
     * Длинный опрос. Возвращает null, если за время ожидания ничего не пришло.
     * Ответ не кэшируем: каждое уведомление должно быть получено ровно один раз.
     * Ключ кэша общий для всех инстансов, поэтому при выходе стор сбрасывается
     * через resetApiState (см. app/store.ts), а опрос идёт только пока открыт чат.
     */
    receiveNotification: build.query<ApiNotification | null, void>({
      query: () => ({
        url: 'receiveNotification',
        params: { receiveTimeout: RECEIVE_TIMEOUT_SECONDS },
        timeout: (RECEIVE_TIMEOUT_SECONDS + 15) * 1000,
      }),
      keepUnusedDataFor: 0,
    }),

    /** Подтверждение обработки: без него API пришлёт то же уведомление снова. */
    deleteNotification: build.mutation<DeleteNotificationResponse, number>({
      query: (receiptId) => ({
        url: `deleteNotification/${receiptId}`,
        method: 'DELETE',
      }),
    }),

    /** Состояние инстанса — проверка учётных данных, которые передаются явно. */
    getStateInstance: build.query<{ stateInstance: string }, Credentials>({
      query: (instance) => ({ url: 'getStateInstance', instance }),
      keepUnusedDataFor: 0,
    }),
  }),
})

export const { useSendMessageMutation, useLazyGetStateInstanceQuery } =
  messengerApi
