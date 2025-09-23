import { create } from 'zustand'
import type { PersistedState, Settings, Subscription } from '../types'
import { createId } from '../utils/id'
import { resolveStatus } from '../utils/subscriptions'
import {
  createSubscription as apiCreateSubscription,
  deleteSubscription as apiDeleteSubscription,
  listSubscriptions as apiListSubscriptions,
  patchSubscription as apiPatchSubscription,
  snoozeSubscription as apiSnoozeSubscription,
  type SubscriptionCreatePayload,
  type SubscriptionUpdatePayload,
  updateSubscriptionStatus as apiUpdateSubscriptionStatus,
} from '../api/subscriptions'

export type ToastVariant = 'info' | 'success' | 'error'

export interface ToastMessage {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

const createDefaultSettings = (): Settings => ({
  locale: 'en',
  timezone:
    typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
      : 'UTC',
  defaultCurrency: 'USD',
  reminderDaysBefore: 7,
  email: undefined,
  telegramLinked: false,
})

export type SubscriptionDraft = Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>

interface StoreState {
  hydrated: boolean
  subscriptions: Subscription[]
  settings: Settings
  ui: {
    toasts: ToastMessage[]
  }
  initialize: () => Promise<void>
  addSubscription: (input: SubscriptionDraft) => Promise<Subscription>
  updateSubscription: (id: string, input: Partial<SubscriptionDraft>) => Promise<Subscription | null>
  removeSubscription: (id: string) => Promise<void>
  archiveSubscription: (id: string) => Promise<Subscription | null>
  restoreSubscription: (id: string) => Promise<Subscription | null>
  snoozeSubscription: (id: string, days?: number) => Promise<Subscription | null>
  clearReminder: (id: string) => Promise<Subscription | null>
  updateSettings: (settings: Partial<Settings>) => void
  importData: (data: PersistedState) => Promise<void>
  recomputeStatuses: () => Promise<void>
  pushToast: (toast: Omit<ToastMessage, 'id'> & { id?: string }) => void
  dismissToast: (id: string) => void
}

const toCreatePayload = (input: SubscriptionDraft): SubscriptionCreatePayload => ({
  name: input.name,
  price: input.price,
  currency: input.currency,
  end_at: input.endAt,
  status: input.status,
  category: input.category ?? null,
  vendor: input.vendor ?? null,
  notes: input.notes ?? null,
})

const toUpdatePayload = (input: Partial<SubscriptionDraft>): SubscriptionUpdatePayload => {
  const payload: SubscriptionUpdatePayload = {}
  if ('name' in input && input.name !== undefined) payload.name = input.name
  if ('price' in input && input.price !== undefined) payload.price = input.price
  if ('currency' in input && input.currency !== undefined) payload.currency = input.currency
  if ('endAt' in input && input.endAt !== undefined) payload.end_at = input.endAt
  if ('category' in input) payload.category = input.category ?? null
  if ('vendor' in input) payload.vendor = input.vendor ?? null
  if ('notes' in input) payload.notes = input.notes ?? null
  if ('status' in input && input.status !== undefined) payload.status = input.status
  return payload
}

export const useStore = create<StoreState>()((set, get) => {
  const refreshSubscriptions = async () => {
    const subscriptions = await apiListSubscriptions()
    set(() => ({
      subscriptions: subscriptions.map((subscription) => ({
        ...subscription,
        status:
          subscription.status === 'archived' || subscription.status === 'canceled'
            ? subscription.status
            : resolveStatus(subscription),
      })),
    }))
    return subscriptions
  }

  return {
    hydrated: false,
    subscriptions: [],
    settings: createDefaultSettings(),
    ui: {
      toasts: [],
    },
    initialize: async () => {
      if (get().hydrated) return
      try {
        await refreshSubscriptions()
      } catch (error) {
        console.error('Failed to load subscriptions', error)
        get().pushToast({
          title: 'Failed to load data',
          description: 'Could not connect to the subscription service.',
          variant: 'error',
        })
      } finally {
        set({ hydrated: true })
      }
    },
    addSubscription: async (input) => {
      const created = await apiCreateSubscription(toCreatePayload(input))
      set((state) => ({
        subscriptions: [created, ...state.subscriptions],
      }))
      return created
    },
    updateSubscription: async (id, input) => {
      const exists = get().subscriptions.find((subscription) => subscription.id === id)
      if (!exists) return null
      const updated = await apiPatchSubscription(id, toUpdatePayload(input))
      set((state) => ({
        subscriptions: state.subscriptions.map((subscription) =>
          subscription.id === id ? updated : subscription,
        ),
      }))
      return updated
    },
    removeSubscription: async (id) => {
      await apiDeleteSubscription(id)
      set((state) => ({
        subscriptions: state.subscriptions.filter((subscription) => subscription.id !== id),
      }))
    },
    archiveSubscription: async (id) => {
      const exists = get().subscriptions.find((subscription) => subscription.id === id)
      if (!exists) return null
      const updated = await apiUpdateSubscriptionStatus(id, 'archived')
      set((state) => ({
        subscriptions: state.subscriptions.map((subscription) =>
          subscription.id === id ? updated : subscription,
        ),
      }))
      return updated
    },
    restoreSubscription: async (id) => {
      const exists = get().subscriptions.find((subscription) => subscription.id === id)
      if (!exists) return null
      const status = exists.status === 'canceled' ? 'canceled' : 'active'
      const updated = await apiUpdateSubscriptionStatus(id, status)
      set((state) => ({
        subscriptions: state.subscriptions.map((subscription) =>
          subscription.id === id ? updated : subscription,
        ),
      }))
      return updated
    },
    snoozeSubscription: async (id) => {
      const exists = get().subscriptions.find((subscription) => subscription.id === id)
      if (!exists) return null
      const updated = await apiSnoozeSubscription(id)
      set((state) => ({
        subscriptions: state.subscriptions.map((subscription) =>
          subscription.id === id ? updated : subscription,
        ),
      }))
      return updated
    },
    clearReminder: async (id) => {
      const exists = get().subscriptions.find((subscription) => subscription.id === id)
      if (!exists) return null
      const updated = await apiPatchSubscription(id, toUpdatePayload({ status: exists.status }))
      set((state) => ({
        subscriptions: state.subscriptions.map((subscription) =>
          subscription.id === id ? updated : subscription,
        ),
      }))
      return updated
    },
    updateSettings: (settings) => {
      set((state) => ({
        settings: {
          ...state.settings,
          ...settings,
        },
      }))
    },
    importData: async (data) => {
      const currentIds = get().subscriptions.map((subscription) => subscription.id)
      await Promise.allSettled(currentIds.map((id) => apiDeleteSubscription(id)))

      for (const subscription of data.subscriptions) {
        await apiCreateSubscription(
          toCreatePayload({
            name: subscription.name,
            price: subscription.price,
            currency: subscription.currency,
            endAt: subscription.endAt,
            category: subscription.category ?? undefined,
            vendor: subscription.vendor ?? undefined,
            notes: subscription.notes ?? undefined,
            status: subscription.status,
            nextReminderAt: subscription.nextReminderAt ?? undefined,
            lastNotifiedAt: subscription.lastNotifiedAt ?? undefined,
          }),
        )
      }

      await refreshSubscriptions()
      set((state) => ({
        settings: {
          ...state.settings,
          ...data.settings,
        },
      }))
    },
    recomputeStatuses: async () => {
      await refreshSubscriptions()
    },
    pushToast: (toast) => {
      const id = toast.id ?? createId()
      set((state) => {
        const nextToasts = [...state.ui.toasts, { ...toast, id }]
        return {
          ui: {
            toasts: nextToasts.slice(-4),
          },
        }
      })
    },
    dismissToast: (id) => {
      set((state) => ({
        ui: {
          toasts: state.ui.toasts.filter((toast) => toast.id !== id),
        },
      }))
    },
  }
})

export const useHydratedStore = <T,>(selector: (state: StoreState) => T, fallback: T) => {
  return useStore((state) => (state.hydrated ? selector(state) : fallback))
}

export const selectSubscriptions = (state: StoreState) => state.subscriptions
export const selectSettings = (state: StoreState) => state.settings
export const selectToasts = (state: StoreState) => state.ui.toasts
