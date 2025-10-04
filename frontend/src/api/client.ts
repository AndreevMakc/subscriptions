import { getAccessToken } from '../utils/authTokens'

const DEFAULT_BASE_URL = 'https://subscriptions-vq0h.onrender.com'

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

const normalizeUrl = (path: string) => {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? DEFAULT_BASE_URL
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base
  return `${trimmedBase}${path}`
}

interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  parseJson?: boolean
  headers?: HeadersInit
  body?: BodyInit | Record<string, unknown>
}

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { parseJson = true, headers, body, ...rest } = options
  const requestHeaders = new Headers(headers ?? {})
  if (!requestHeaders.has('Accept')) {
    requestHeaders.set('Accept', 'application/json')
  }

  const accessToken = getAccessToken()
  if (accessToken && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`)
  }

  let requestBody: BodyInit | undefined
  if (body instanceof FormData || body instanceof URLSearchParams || body instanceof Blob) {
    requestBody = body
  } else if (typeof body === 'string') {
    requestBody = body
    if (!requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json')
    }
  } else if (body !== undefined) {
    requestBody = JSON.stringify(body)
    requestHeaders.set('Content-Type', 'application/json')
  }

  const response = await fetch(normalizeUrl(path), {
    ...rest,
    headers: requestHeaders,
    body: requestBody,
    credentials: rest.credentials ?? 'omit',
  })

  const isJsonResponse = parseJson && response.status !== 204
  let data: unknown = null

  if (isJsonResponse) {
    const text = await response.text()
    if (text.length > 0) {
      try {
        data = JSON.parse(text)
      } catch (error) {
        console.error('Failed to parse JSON response', error)
        data = text
      }
    }
  }

  if (!response.ok) {
    throw new ApiError(
      `Request to ${path} failed with status ${response.status}`,
      response.status,
      data,
    )
  }

  return data as T
}
