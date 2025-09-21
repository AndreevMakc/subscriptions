import { addDays } from 'date-fns'
import { create } from 'zustand'
import type { StoreApi } from 'zustand'
import { persist, type PersistStorage, type StateStorage } from 'zustand/middleware'
import type { ConfirmState, PersistedData, Settings, Status, Subscription, ToastMessage } from '../types'
import { createId } from '../utils/id'
import { snoozeDate, isExpired as isExpiredByDate } from '../utils/dates'

const STORAGE_KEY = 'subskeeper:v1'

const detectTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
  } catch {
    return 'UTC'
  }
}

const defaultSettings: Settings = {
  locale: 'en',
  timezone: detectTimezone(),
  defaultCurrency: 'USD',
  reminderDaysBefore: 7,
  email: '',
  telegramLinked: false,
}

const createSeedSubscriptions = (): Subscription[] => {
  const now = new Date()
  const seeds = [
    {
      name: 'Netflix',
      price: 9.99,
      currency: 'USD' as const,
      category: 'Entertainment',
      vendor: 'Netflix',
      endOffset: 5,
    },
    {
      name: 'Figma',
      price: 12,
      currency: 'USD' as const,
      category: 'Work',
      vendor: 'Figma',
      endOffset: -2,
    },
    {
      name: 'Spotify',
      price: 4.99,
      currency: 'EUR' as const,
      category: 'Music',
      vendor: 'Spotify',
      endOffset: 15,
    },
  ]
  return seeds.map((seed, index) => {
    const createdAt = addDays(now, -30 - index * 10)
    const endAt = addDays(now, seed.endOffset)
    const timestamp = new Date().toISOString()
    return {
      id: createId(),
      name: seed.name,
      price: seed.price,
      currency: seed.currency,
      endAt: endAt.toISOString(),
      notes: undefined,
      category: seed.category,
      vendor: seed.vendor,
      status: 'active',
      nextReminderAt: undefined,
      lastNotifiedAt: undefined,
      createdAt: createdAt.toISOString(),
      updatedAt: timestamp,
    }
  })
}

export type SubscriptionDraft = Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string
}

interface SubscriptionSlice {
  subscriptions: Subscription[]
  addSubscription: (input: SubscriptionDraft) => Subscription
  updateSubscription: (id: string, changes: Partial<Omit<SubscriptionDraft, 'id'>>) => void
  removeSubscription: (id: string) => void
  archiveSubscription: (id: string) => void
  restoreSubscription: (id: string) => void
  snoozeSubscription: (id: string, days?: number) => void
  recomputeStatuses: () => void
}

interface SettingsSlice {
  settings: Settings
  updateSettings: (updates: Partial<Settings>) => void
}

interface UiSlice {
  ui: {
    toasts: ToastMessage[]
    confirm: ConfirmState | null
    showArchived: boolean
  }
  hasHydrated: boolean
  pushToast: (toast: Omit<ToastMessage, 'id' | 'createdAt'> & { id?: string }) => string
  dismissToast: (id: string) => void
  setConfirm: (confirm: Omit<ConfirmState, 'id'> | null) => string | null
  setShowArchived: (value: boolean) => void
}

export type StoreState = SubscriptionSlice & SettingsSlice & UiSlice & {
  importData: (data: PersistedData) => void
  exportData: () => PersistedData
  resetDemoData: () => void
}

const isClient = typeof window !== 'undefined'

type PersistedSlice = Pick<StoreState, 'subscriptions' | 'settings'>

const fallbackStorage: StateStorage = {
  getItem: (name: string) => {
    void name
    return null
  },
  setItem: (name: string, value: string) => {
    void name
    void value
    return undefined
  },
  removeItem: (name: string) => {
    void name
    return undefined
  },
}

const storage: PersistStorage<PersistedSlice> = {
  getItem: async (name) => {
    const store = isClient ? window.localStorage : fallbackStorage
    const raw = store.getItem(name)
    const value = typeof raw === 'string' ? raw : await raw
    if (!value) return null
    try {
      const data = JSON.parse(value) as PersistedData
      return {
        state: {
          subscriptions: data.subscriptions ?? [],
          settings: { ...defaultSettings, ...(data.settings ?? {}) },
        },
        version: data.version ?? 1,
      }
    } catch (error) {
      console.warn('[SubsKeeper] Unable to parse persisted data', error)
      return null
    }
  },
  setItem: (name, value) => {
    if (!isClient) return
    try {
      const data: PersistedData = {
        version: value.version ?? 1,
        subscriptions: value.state.subscriptions,
        settings: value.state.settings,
      }
      window.localStorage.setItem(name, JSON.stringify(data))
    } catch (error) {
      console.warn('[SubsKeeper] Unable to persist data', error)
    }
  },
  removeItem: (name) => {
    if (!isClient) return
    window.localStorage.removeItem(name)
  },
}

const initialToasts: ToastMessage[] = []

let storeSet: StoreApi<StoreState>['setState'] | null = null
let storeGet: StoreApi<StoreState>['getState'] | null = null

export const useStore = create<StoreState>()(
  persist(
    (set, get) => {
      storeSet = set
      storeGet = get
      return {
        subscriptions: createSeedSubscriptions(),
        settings: defaultSettings,
        ui: {
          toasts: initialToasts,
          confirm: null,
          showArchived: false,
        },
        hasHydrated: false,
        addSubscription: (input) => {
        const timestamp = new Date().toISOString()
        const subscription: Subscription = {
          id: input.id ?? createId(),
          name: input.name.trim(),
          price: Number(input.price),
          currency: input.currency,
          endAt: input.endAt,
          notes: input.notes?.trim() || undefined,
          category: input.category?.trim() || undefined,
          vendor: input.vendor?.trim() || undefined,
          status: input.status ?? 'active',
          nextReminderAt: input.nextReminderAt,
          lastNotifiedAt: input.lastNotifiedAt,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
        set((state) => ({ subscriptions: [...state.subscriptions, subscription] }))
        get().recomputeStatuses()
        get().pushToast({ title: 'Subscription added', tone: 'success' })
        return subscription
      },
      updateSubscription: (id, changes) => {
        const timestamp = new Date().toISOString()
        set((state) => ({
          subscriptions: state.subscriptions.map((subscription) => {
            if (subscription.id !== id) return subscription
            const next: Subscription = {
              ...subscription,
              ...changes,
              name: changes.name ? changes.name.trim() : subscription.name,
              notes: changes.notes !== undefined ? changes.notes?.trim() || undefined : subscription.notes,
              category: changes.category !== undefined ? changes.category?.trim() || undefined : subscription.category,
              vendor: changes.vendor !== undefined ? changes.vendor?.trim() || undefined : subscription.vendor,
              price: changes.price !== undefined ? Number(changes.price) : subscription.price,
              updatedAt: timestamp,
            }
            if (changes.endAt && new Date(changes.endAt) > new Date() && next.status === 'expired') {
              next.status = 'active'
            }
            return next
          }),
        }))
        get().recomputeStatuses()
        get().pushToast({ title: 'Subscription updated', tone: 'success' })
      },
      removeSubscription: (id) => {
        set((state) => ({ subscriptions: state.subscriptions.filter((subscription) => subscription.id !== id) }))
        get().pushToast({ title: 'Subscription removed', tone: 'info' })
      },
      archiveSubscription: (id) => {
        const timestamp = new Date().toISOString()
        set((state) => ({
          subscriptions: state.subscriptions.map((subscription) =>
            subscription.id === id
              ? {
                  ...subscription,
                  status: 'archived',
                  nextReminderAt: undefined,
                  updatedAt: timestamp,
                }
              : subscription,
          ),
        }))
        get().pushToast({ title: 'Moved to archive', tone: 'info' })
      },
      restoreSubscription: (id) => {
        const timestamp = new Date().toISOString()
        set((state) => ({
          subscriptions: state.subscriptions.map((subscription) =>
            subscription.id === id
              ? {
                  ...subscription,
                  status: 'active',
                  updatedAt: timestamp,
                }
              : subscription,
          ),
        }))
        get().pushToast({ title: 'Subscription restored', tone: 'success' })
      },
      snoozeSubscription: (id, days = 7) => {
        set((state) => ({
          subscriptions: state.subscriptions.map((subscription) =>
            subscription.id === id
              ? {
                  ...subscription,
                  nextReminderAt: snoozeDate(days),
                  updatedAt: new Date().toISOString(),
                }
              : subscription,
          ),
        }))
        get().pushToast({ title: `Snoozed for ${days} days`, tone: 'info' })
      },
      recomputeStatuses: () => {
        const timestamp = new Date().toISOString()
        set((state) => ({
          subscriptions: state.subscriptions.map((subscription) => {
            if (subscription.status === 'archived' || subscription.status === 'canceled') {
              return subscription
            }
            const expired = isExpiredByDate(subscription)
            if (expired && subscription.status !== 'expired') {
              return { ...subscription, status: 'expired', updatedAt: timestamp }
            }
            if (!expired && subscription.status === 'expired') {
              return { ...subscription, status: 'active', updatedAt: timestamp }
            }
            return subscription
          }),
        }))
      },
      updateSettings: (updates) => {
        set((state) => ({ settings: { ...state.settings, ...updates } }))
        get().pushToast({ title: 'Settings saved', tone: 'success' })
      },
      pushToast: (toast) => {
        const id = toast.id ?? createId()
        const entry: ToastMessage = {
          id,
          title: toast.title,
          description: toast.description,
          tone: toast.tone ?? 'info',
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          ui: {
            ...state.ui,
            toasts: [...state.ui.toasts.filter((item) => item.id !== id), entry].slice(-4),
          },
        }))
        return id
      },
      dismissToast: (id) => {
        set((state) => ({
          ui: {
            ...state.ui,
            toasts: state.ui.toasts.filter((toast) => toast.id !== id),
          },
        }))
      },
      setConfirm: (confirm) => {
        if (!confirm) {
          set((state) => ({
            ui: {
              ...state.ui,
              confirm: null,
            },
          }))
          return null
        }
        const id = createId()
        const payload: ConfirmState = {
          id,
          confirmLabel: 'Confirm',
          cancelLabel: 'Cancel',
          ...confirm,
        }
        set((state) => ({
          ui: {
            ...state.ui,
            confirm: payload,
          },
        }))
        return id
      },
      setShowArchived: (value) => {
        set((state) => ({
          ui: {
            ...state.ui,
            showArchived: value,
          },
        }))
      },
      importData: (data) => {
        if (!data || !Array.isArray(data.subscriptions) || !data.settings) {
          get().pushToast({ title: 'Import failed', description: 'Data format invalid', tone: 'error' })
          return
        }
        const sanitized = data.subscriptions.map((item) => {
          const statusValues: Status[] = ['active', 'canceled', 'expired', 'archived']
          const status = statusValues.includes(item.status) ? item.status : 'active'
          return {
            ...item,
            id: item.id ?? createId(),
            status,
            createdAt: item.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        })
        set({
          subscriptions: sanitized,
          settings: { ...defaultSettings, ...data.settings },
        })
        get().recomputeStatuses()
        get().pushToast({ title: 'Data imported', tone: 'success' })
      },
      exportData: () => {
        const state = get()
        return {
          version: 1,
          subscriptions: state.subscriptions,
          settings: state.settings,
        }
      },
        resetDemoData: () => {
          set({
            subscriptions: createSeedSubscriptions(),
            settings: defaultSettings,
          })
          get().pushToast({ title: 'Demo data restored', tone: 'info' })
        },
      }
    },
    {
      name: STORAGE_KEY,
      storage,
      version: 1,
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error('[SubsKeeper] Persist error', error)
        }
        const currentGet = storeGet
        const currentSet = storeSet
        currentGet?.().recomputeStatuses()
        currentSet?.((prev) => ({ ...prev, hasHydrated: true }))
      },
      partialize: (state) => ({
        subscriptions: state.subscriptions,
        settings: state.settings,
      }),
    },
  ),
)

export const useSubscriptions = () => useStore((state) => state.subscriptions)
export const useSettings = () => useStore((state) => state.settings)
export const useUiState = () => useStore((state) => state.ui)
