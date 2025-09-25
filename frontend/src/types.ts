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
  nextReminderAt?: string | null
  lastNotifiedAt?: string | null
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

export interface PersistedState {
  subscriptions: Array<
    Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string
      createdAt?: string
      updatedAt?: string
      nextReminderAt?: string | null
      lastNotifiedAt?: string | null
    }
  >
  settings: Settings
}
