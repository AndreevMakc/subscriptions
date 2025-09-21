import type { Currency, Status } from '../types'

export const FX_RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  RUB: 0.011,
  UAH: 0.026,
  KZT: 0.0022,
  BYN: 0.3,
}

export const SUPPORTED_CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'RUB', 'UAH', 'KZT', 'BYN']

export const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'expired', label: 'Expired' },
  { value: 'archived', label: 'Archived' },
]

export const STORAGE_KEY = 'subskeeper:v1'
