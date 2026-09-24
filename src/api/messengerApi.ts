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
 * Хост инстанса GREEN-API: https://{первые 4 цифры idInstance}.api.greenapi.com.
 * Перекрывается переменной окружения VITE_API_BASE_URL.
 */
function apiBaseUrl(credentials: Credentials): string {
  const override = import.meta.env.VITE_API_BASE_URL
  if (override) return override.replace(/\/$/, '')
  return `https://${credentials.idInstance.slice(0, 4)}.api.greenapi.com`
}

/** Сколько секунд API держит открытым запрос за входящими уведомлениями. */
export const RECEIVE_TIMEOUT_SECONDS = 20

/**
 * Собирает адрес вида {хост}/waInstance{id}/{метод}/{токен}/{хвост}.
 * Единственное место, где учётные данные попадают в URL.
 */
function instanceUrl(credentials: Credentials, url: string): string {
  const [method, ...rest] = url.split('/')
  const suffix = rest.length > 0 ? `/${rest.join('/')}` : ''
  return `${apiBaseUrl(credentials)}/waInstance${credentials.idInstance}/${method}/${credentials.apiTokenInstance}${suffix}`
}

const rawBaseQuery = fetchBaseQuery({ baseUrl: '/' })

const baseQueryWithCredentials: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = (args, api, extraOptions) => {
  const { credentials } = (api.getState() as RootState).auth
  if (!credentials) {
    return {
      error: {
        status: 401,
        data: 'Не заданы учётные данные API',
      } satisfies FetchBaseQueryError,
    }
  }

  const request = typeof args === 'string' ? { url: args } : args
  return rawBaseQuery(
    { ...request, url: instanceUrl(credentials, request.url) },
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

    /** Состояние инстанса — используем для проверки учётных данных при входе. */
    getStateInstance: build.query<{ stateInstance: string }, void>({
      query: () => ({ url: 'getStateInstance' }),
    }),
  }),
})

export const { useSendMessageMutation, useLazyGetStateInstanceQuery } =
  messengerApi
