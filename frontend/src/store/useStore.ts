import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { PersistedState, Settings, Subscription } from '../types'
import { STORAGE_KEY } from '../utils/constants'
import { createDemoSubscriptions } from '../data/seed'
import { createId } from '../utils/id'
import { createSnoozeDate } from '../utils/dates'
import { resolveStatus } from '../utils/subscriptions'

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

interface StoreState {
  hydrated: boolean
  subscriptions: Subscription[]
  settings: Settings
  ui: {
    toasts: ToastMessage[]
  }
  addSubscription: (input: SubscriptionDraft) => Subscription
  updateSubscription: (id: string, input: Partial<SubscriptionDraft>) => Subscription | null
  removeSubscription: (id: string) => void
  archiveSubscription: (id: string) => void
  restoreSubscription: (id: string) => void
  snoozeSubscription: (id: string, days?: number) => void
  clearReminder: (id: string) => void
  updateSettings: (settings: Partial<Settings>) => void
  importData: (data: PersistedState) => void
  pushToast: (toast: Omit<ToastMessage, 'id'> & { id?: string }) => void
  dismissToast: (id: string) => void
  recomputeStatuses: () => void
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
      addSubscription: (input) => {
        const now = new Date().toISOString()
        const statusBase = input.status ?? 'active'
        const computedStatus =
          statusBase === 'archived' || statusBase === 'canceled'
            ? statusBase
            : resolveStatus({
                ...input,
                id: 'temp',
                createdAt: now,
                updatedAt: now,
              } as Subscription)
        const subscription: Subscription = {
          ...input,
          id: createId(),
          status: computedStatus,
          nextReminderAt: input.nextReminderAt || undefined,
          lastNotifiedAt: input.lastNotifiedAt || undefined,
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          subscriptions: [subscription, ...state.subscriptions],
        }))
        return subscription
      },
      updateSubscription: (id, input) => {
        let result: Subscription | null = null
        set((state) => {
          const subscriptions = state.subscriptions.map((subscription) => {
            if (subscription.id !== id) return subscription
            const now = new Date().toISOString()
            const merged: Subscription = {
              ...subscription,
              ...input,
              updatedAt: now,
            }
            const statusBase = input.status ?? merged.status
            merged.status =
              statusBase === 'archived' || statusBase === 'canceled'
                ? statusBase
                : resolveStatus(merged)
            if (input.nextReminderAt === null) {
              merged.nextReminderAt = undefined
            }
            result = merged
            return merged
          })
          return { subscriptions }
        })
        return result
      },
      removeSubscription: (id) => {
        set((state) => ({
          subscriptions: state.subscriptions.filter((subscription) => subscription.id !== id),
        }))
      },
      archiveSubscription: (id) => {
        set((state) => ({
          subscriptions: state.subscriptions.map((subscription) =>
            subscription.id === id
              ? {
                  ...subscription,
                  status: 'archived',
                  nextReminderAt: undefined,
                  updatedAt: new Date().toISOString(),
                }
              : subscription,
          ),
        }))
      },
      restoreSubscription: (id) => {
        set((state) => ({
          subscriptions: state.subscriptions.map((subscription) =>
            subscription.id === id
              ? {
                  ...subscription,
                  status: resolveStatus({ ...subscription, status: 'active' }),
                  updatedAt: new Date().toISOString(),
                }
              : subscription,
          ),
        }))
      },
      snoozeSubscription: (id, days = 7) => {
        set((state) => ({
          subscriptions: state.subscriptions.map((subscription) =>
            subscription.id === id
              ? {
                  ...subscription,
                  nextReminderAt: createSnoozeDate(days),
                  updatedAt: new Date().toISOString(),
                }
              : subscription,
          ),
        }))
      },
      clearReminder: (id) => {
        set((state) => ({
          subscriptions: state.subscriptions.map((subscription) =>
            subscription.id === id
              ? {
                  ...subscription,
                  nextReminderAt: undefined,
                  updatedAt: new Date().toISOString(),
                }
              : subscription,
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
      importData: (data) => {
        get().finishHydration(data)
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
      recomputeStatuses: () => {
        set((state) => ({
          subscriptions: state.subscriptions.map((subscription) => {
            const computed = resolveStatus(subscription)
            if (computed === subscription.status) return subscription
            return {
              ...subscription,
              status: computed,
              updatedAt: new Date().toISOString(),
            }
          }),
        }))
      },
      finishHydration: (persisted) => {
        const defaults = createDefaultSettings()
        const nowIso = new Date().toISOString()
        const rawSubscriptions = persisted?.subscriptions
        const incoming = Array.isArray(rawSubscriptions) ? rawSubscriptions : undefined
        const hydratedSubscriptions = (incoming ?? createDemoSubscriptions()).map((subscription) => {
          const id = subscription.id || createId()
          const createdAt = subscription.createdAt || nowIso
          const updatedAt = subscription.updatedAt || nowIso
          const nextReminderAt = subscription.nextReminderAt || undefined
          const lastNotifiedAt = subscription.lastNotifiedAt || undefined
          const status =
            subscription.status === 'archived' || subscription.status === 'canceled'
              ? subscription.status
              : resolveStatus({
                  ...subscription,
                  id,
                  createdAt,
                  updatedAt,
                  nextReminderAt,
                  lastNotifiedAt,
                })
          return {
            ...subscription,
            id,
            createdAt,
            updatedAt,
            nextReminderAt,
            lastNotifiedAt,
            status,
          }
        })

        set({
          hydrated: true,
          subscriptions: hydratedSubscriptions,
          settings: persisted?.settings ? { ...defaults, ...persisted.settings } : defaults,
        })
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
