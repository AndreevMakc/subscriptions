import type { Currency, Status, Subscription } from '../types'

const API_BASE_URL = 'https://subscriptions-vq0h.onrender.com'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface ApiSubscription {
  id: string
  user_id: string
  name: string
  price: string | number
  currency: string
  end_at: string
  status: Status
  category: string | null
  vendor: string | null
  notes: string | null
  next_reminder_at: string | null
  last_notified_at: string | null
  created_at: string
  updated_at: string
}

const parsePrice = (value: ApiSubscription['price']) => {
  if (typeof value === 'number') return value
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

const mapSubscription = (subscription: ApiSubscription): Subscription => ({
  id: subscription.id,
  name: subscription.name,
  price: parsePrice(subscription.price),
  currency: subscription.currency as Currency,
  endAt: subscription.end_at,
  status: subscription.status,
  category: subscription.category ?? undefined,
  vendor: subscription.vendor ?? undefined,
  notes: subscription.notes ?? undefined,
  nextReminderAt: subscription.next_reminder_at ?? undefined,
  lastNotifiedAt: subscription.last_notified_at ?? undefined,
  createdAt: subscription.created_at,
  updatedAt: subscription.updated_at,
})

const buildHeaders = (init?: RequestInit) => {
  const headers = new Headers(init?.headers)
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return headers
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: buildHeaders(init),
    })
  } catch {
    throw new ApiError('Failed to reach the backend service', 0)
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      try {
        const data = (await response.json()) as { detail?: string }
        if (typeof data.detail === 'string' && data.detail.trim()) {
          message = data.detail
        }
      } catch {
        // ignore JSON parsing errors and fall back to default message
      }
    } else {
      const text = await response.text()
      if (text.trim()) {
        message = text.trim()
      }
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const contentLength = response.headers.get('content-length')
  if (contentLength === '0') {
    return undefined as T
  }

  const data = (await response.json()) as T
  return data
}

const cleanPayload = (payload: Record<string, unknown>) => {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  )
}

export interface SubscriptionPayload {
  name: string
  price: number
  currency: Currency
  endAt: string
  category?: string
  vendor?: string
  notes?: string
  status?: Status
}

export type SubscriptionUpdatePayload = Partial<SubscriptionPayload>

const mapCreatePayload = (payload: SubscriptionPayload) =>
  cleanPayload({
    name: payload.name,
    price: payload.price,
    currency: payload.currency,
    end_at: payload.endAt,
    category: payload.category ?? null,
    vendor: payload.vendor ?? null,
    notes: payload.notes ?? null,
    status: payload.status,
  })

const mapUpdatePayload = (payload: SubscriptionUpdatePayload) => {
  const body: Record<string, unknown> = {}
  if ('name' in payload) body.name = payload.name
  if ('price' in payload) body.price = payload.price
  if ('currency' in payload) body.currency = payload.currency
  if ('endAt' in payload) body.end_at = payload.endAt
  if ('category' in payload) body.category = payload.category ?? null
  if ('vendor' in payload) body.vendor = payload.vendor ?? null
  if ('notes' in payload) body.notes = payload.notes ?? null
  if ('status' in payload) body.status = payload.status
  return cleanPayload(body)
}

export const fetchSubscriptions = async (): Promise<Subscription[]> => {
  const data = await request<ApiSubscription[]>('/api/v1/subscriptions')
  return data.map(mapSubscription)
}

export const createSubscription = async (
  payload: SubscriptionPayload,
): Promise<Subscription> => {
  const data = await request<ApiSubscription>('/api/v1/subscriptions', {
    method: 'POST',
    body: JSON.stringify(mapCreatePayload(payload)),
  })
  return mapSubscription(data)
}

export const updateSubscription = async (
  id: string,
  payload: SubscriptionUpdatePayload,
): Promise<Subscription> => {
  const data = await request<ApiSubscription>(`/api/v1/subscriptions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(mapUpdatePayload(payload)),
  })
  return mapSubscription(data)
}

export const deleteSubscription = async (id: string): Promise<void> => {
  await request(`/api/v1/subscriptions/${id}`, { method: 'DELETE' })
}

export const updateSubscriptionStatus = async (
  id: string,
  status: Status,
): Promise<Subscription> => {
  const data = await request<ApiSubscription>(`/api/v1/subscriptions/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  return mapSubscription(data)
}

export const snoozeSubscription = async (id: string): Promise<Subscription> => {
  const data = await request<ApiSubscription>(`/api/v1/subscriptions/${id}/snooze`, {
    method: 'POST',
  })
  return mapSubscription(data)
}

export const refreshSubscription = async (id: string): Promise<Subscription> => {
  const data = await request<ApiSubscription>(`/api/v1/subscriptions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  })
  return mapSubscription(data)
}

