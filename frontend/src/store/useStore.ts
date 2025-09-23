import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { PersistedState, Settings, Subscription } from '../types'
import { STORAGE_KEY } from '../utils/constants'
import { createId } from '../utils/id'
import {
  createSubscription as apiCreateSubscription,
  deleteSubscription as apiDeleteSubscription,
  fetchSubscriptions as apiFetchSubscriptions,
  refreshSubscription as apiRefreshSubscription,
  snoozeSubscription as apiSnoozeSubscription,
  updateSubscription as apiUpdateSubscription,
  updateSubscriptionStatus as apiUpdateSubscriptionStatus,
  type SubscriptionPayload,
  type SubscriptionUpdatePayload,
} from '../utils/api'

export type ToastVariant = 'info' | 'success' | 'error'

export interface ToastMessage {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

const memoryStorage: Storage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined,
  key: () => null,
  get length() {
    return 0
  },
}

const storage = createJSONStorage<PersistedState>(() => {
  if (typeof window === 'undefined') {
    return memoryStorage
  }
  return window.localStorage
})

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

const mapDraftToCreatePayload = (input: SubscriptionDraft): SubscriptionPayload => ({
  name: input.name,
  price: input.price,
  currency: input.currency,
  endAt: input.endAt,
  category: input.category,
  vendor: input.vendor,
  notes: input.notes,
  status: input.status,
})

const mapDraftToUpdatePayload = (
  input: Partial<SubscriptionDraft>,
): SubscriptionUpdatePayload => {
  const payload: SubscriptionUpdatePayload = {}
  if ('name' in input) payload.name = input.name
  if ('price' in input) payload.price = input.price
  if ('currency' in input) payload.currency = input.currency
  if ('endAt' in input) payload.endAt = input.endAt
  if ('category' in input) payload.category = input.category
  if ('vendor' in input) payload.vendor = input.vendor
  if ('notes' in input) payload.notes = input.notes
  if ('status' in input) payload.status = input.status
  return payload
}

const HYDRATION_ERROR_MESSAGES = {
  en: {
    title: 'Request failed',
    description: 'Unable to reach the server. Try again shortly.',
  },
  ru: {
    title: 'Ошибка запроса',
    description: 'Не удалось связаться с сервером. Попробуйте позже.',
  },
} as const

interface StoreState {
  hydrated: boolean
  subscriptions: Subscription[]
  settings: Settings
  ui: {
    toasts: ToastMessage[]
  }
  loadSubscriptions: () => Promise<void>
  addSubscription: (input: SubscriptionDraft) => Promise<Subscription>
  updateSubscription: (id: string, input: Partial<SubscriptionDraft>) => Promise<Subscription | null>
  removeSubscription: (id: string) => Promise<void>
  archiveSubscription: (id: string) => Promise<void>
  restoreSubscription: (id: string) => Promise<void>
  snoozeSubscription: (id: string, days?: number) => Promise<void>
  clearReminder: (id: string) => Promise<void>
  updateSettings: (settings: Partial<Settings>) => void
  importData: (data: PersistedState) => Promise<void>
  pushToast: (toast: Omit<ToastMessage, 'id'> & { id?: string }) => void
  dismissToast: (id: string) => void
  finishHydration: (data?: PersistedState) => void
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      subscriptions: [],
      settings: createDefaultSettings(),
      ui: {
        toasts: [],
      },
      loadSubscriptions: async () => {
        const subscriptions = await apiFetchSubscriptions()
        set({ subscriptions })
      },
      addSubscription: async (input) => {
        const payload = mapDraftToCreatePayload(input)
        const created = await apiCreateSubscription(payload)
        set((state) => ({
          subscriptions: [created, ...state.subscriptions.filter((item) => item.id !== created.id)],
        }))
        return created
      },
      updateSubscription: async (id, input) => {
        const payload = mapDraftToUpdatePayload(input)
        if (Object.keys(payload).length === 0) {
          return get().subscriptions.find((subscription) => subscription.id === id) ?? null
        }
        const updated = await apiUpdateSubscription(id, payload)
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
        const updated = await apiUpdateSubscriptionStatus(id, 'archived')
        set((state) => ({
          subscriptions: state.subscriptions.map((subscription) =>
            subscription.id === id ? updated : subscription,
          ),
        }))
      },
      restoreSubscription: async (id) => {
        const updated = await apiUpdateSubscriptionStatus(id, 'active')
        set((state) => ({
          subscriptions: state.subscriptions.map((subscription) =>
            subscription.id === id ? updated : subscription,
          ),
        }))
      },
      snoozeSubscription: async (id, _days) => {
        void _days
        const updated = await apiSnoozeSubscription(id)
        set((state) => ({
          subscriptions: state.subscriptions.map((subscription) =>
            subscription.id === id ? updated : subscription,
          ),
        }))
      },
      clearReminder: async (id) => {
        const updated = await apiRefreshSubscription(id)
        set((state) => ({
          subscriptions: state.subscriptions.map((subscription) =>
            subscription.id === id ? updated : subscription,
          ),
        }))
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
        const defaults = createDefaultSettings()
        if (data.settings) {
          set({ settings: { ...defaults, ...data.settings } })
        }
        let hadError = false
        if (Array.isArray(data.subscriptions) && data.subscriptions.length > 0) {
          for (const subscription of data.subscriptions) {
            const draft: SubscriptionDraft = {
              name: subscription.name,
              price: subscription.price,
              currency: subscription.currency,
              endAt: subscription.endAt,
              category: subscription.category,
              vendor: subscription.vendor,
              notes: subscription.notes,
              status: subscription.status,
              nextReminderAt: subscription.nextReminderAt ?? undefined,
              lastNotifiedAt: subscription.lastNotifiedAt ?? undefined,
            }
            try {
              await apiCreateSubscription(mapDraftToCreatePayload(draft))
            } catch (error) {
              hadError = true
              console.error('Failed to import subscription', error)
            }
          }
          await get().loadSubscriptions()
        }
        if (hadError) {
          throw new Error('SUBSKEEPER_IMPORT_FAILED')
        }
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
      finishHydration: (persisted) => {
        const defaults = createDefaultSettings()
        const fallbackSubscriptions = Array.isArray(persisted?.subscriptions)
          ? persisted.subscriptions.map((subscription) => ({
              ...subscription,
              id: subscription.id ?? createId(),
              createdAt: subscription.createdAt ?? new Date().toISOString(),
              updatedAt: subscription.updatedAt ?? new Date().toISOString(),
              nextReminderAt: subscription.nextReminderAt ?? undefined,
              lastNotifiedAt: subscription.lastNotifiedAt ?? undefined,
            }))
          : []

        set({
          hydrated: false,
          subscriptions: fallbackSubscriptions,
          settings: persisted?.settings ? { ...defaults, ...persisted.settings } : defaults,
        })

        void (async () => {
          try {
            const remote = await apiFetchSubscriptions()
            set({ subscriptions: remote, hydrated: true })
          } catch (error) {
            console.error('SubsKeeper hydration failed', error)
            if (fallbackSubscriptions.length === 0) {
              const locale = get().settings.locale
              const message = HYDRATION_ERROR_MESSAGES[locale] ?? HYDRATION_ERROR_MESSAGES.en
              get().pushToast({
                title: message.title,
                description: message.description,
                variant: 'error',
              })
            }
            set({ hydrated: true })
          }
        })()
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage,
      partialize: (state) => ({
        subscriptions: state.subscriptions,
        settings: state.settings,
      }),
      onRehydrateStorage: (storeState) => (persisted, error) => {
        if (error) {
          console.error('SubsKeeper hydration failed', error)
          storeState.finishHydration()
          return
        }
        storeState.finishHydration(persisted as PersistedState | undefined)
      },
    },
  ),
)

export const useHydratedStore = <T,>(selector: (state: StoreState) => T, fallback: T) => {
  return useStore((state) => (state.hydrated ? selector(state) : fallback))
}

export const selectSubscriptions = (state: StoreState) => state.subscriptions
export const selectSettings = (state: StoreState) => state.settings
export const selectToasts = (state: StoreState) => state.ui.toasts
