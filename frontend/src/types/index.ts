export type Currency = 'USD' | 'EUR' | 'GBP' | 'RUB' | 'UAH' | 'KZT' | 'BYN'

export type Status = 'active' | 'canceled' | 'expired' | 'archived'

export interface Subscription {
  id: string
  name: string
  price: number
  currency: Currency
  endAt: string
  notes?: string
  category?: string
  vendor?: string
  status: Status
  nextReminderAt?: string
  lastNotifiedAt?: string
  createdAt: string
  updatedAt: string
}

export interface Settings {
  locale: 'en' | 'ru'
  timezone: string
  defaultCurrency: Currency
  reminderDaysBefore: number
  email?: string
  telegramLinked?: boolean
}

export interface PersistedData {
  subscriptions: Subscription[]
  settings: Settings
  version?: number
}

export type ToastTone = 'info' | 'success' | 'error'

export interface ToastMessage {
  id: string
  title: string
  description?: string
  tone?: ToastTone
  createdAt: string
}

export interface ConfirmState {
  id: string
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel?: () => void
}
