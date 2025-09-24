import type { Status, Subscription } from '../types'
import { apiRequest } from './client'

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

export interface SubscriptionCreatePayload extends Record<string, unknown> {
  name: string
  price: number
  currency: string
  end_at: string
  status?: Status
  category?: string | null
  vendor?: string | null
  notes?: string | null
  next_reminder_at?: string | null
  last_notified_at?: string | null
}

export type SubscriptionUpdatePayload = Partial<SubscriptionCreatePayload>

const mapSubscription = (payload: ApiSubscription): Subscription => ({
  id: payload.id,
  name: payload.name,
  price: typeof payload.price === 'string' ? Number.parseFloat(payload.price) : payload.price,
  currency: payload.currency as Subscription['currency'],
  endAt: payload.end_at,
  status: payload.status,
  category: payload.category ?? undefined,
  vendor: payload.vendor ?? undefined,
  notes: payload.notes ?? undefined,
  nextReminderAt: payload.next_reminder_at,
  lastNotifiedAt: payload.last_notified_at,
  createdAt: payload.created_at,
  updatedAt: payload.updated_at,
})

export const listSubscriptions = async (): Promise<Subscription[]> => {
  const data = await apiRequest<ApiSubscription[]>('/api/v1/subscriptions')
  return data.map(mapSubscription)
}

export const createSubscription = async (
  payload: SubscriptionCreatePayload,
): Promise<Subscription> => {
  const data = await apiRequest<ApiSubscription>('/api/v1/subscriptions', {
    method: 'POST',
    body: payload,
  })
  return mapSubscription(data)
}

export const patchSubscription = async (
  id: string,
  payload: SubscriptionUpdatePayload,
): Promise<Subscription> => {
  const data = await apiRequest<ApiSubscription>(`/api/v1/subscriptions/${id}`, {
    method: 'PATCH',
    body: payload,
  })
  return mapSubscription(data)
}

export const deleteSubscription = async (id: string): Promise<void> => {
  await apiRequest(`/api/v1/subscriptions/${id}`, {
    method: 'DELETE',
    parseJson: false,
  })
}

export const updateSubscriptionStatus = async (
  id: string,
  status: Status,
): Promise<Subscription> => {
  const data = await apiRequest<ApiSubscription>(`/api/v1/subscriptions/${id}/status`, {
    method: 'PATCH',
    body: { status },
  })
  return mapSubscription(data)
}

export const snoozeSubscription = async (id: string): Promise<Subscription> => {
  const data = await apiRequest<ApiSubscription>(`/api/v1/subscriptions/${id}/snooze`, {
    method: 'POST',
  })
  return mapSubscription(data)
}
