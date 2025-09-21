import { format, formatDistanceToNow, parseISO } from 'date-fns'
import type { Currency, Settings, Status } from '../types'
import { parseDate } from './dates'

export const formatMoney = (amount: number, currency: Currency, locale?: Settings['locale']) => {
  const resolvedLocale = locale ?? 'en'
  return new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const formatDate = (iso?: string | null, dateFormat = 'MMM d, yyyy') => {
  const parsed = parseDate(iso)
  if (!parsed) return '—'
  return format(parsed, dateFormat)
}

export const formatRelativeToNow = (iso?: string | null) => {
  const parsed = parseDate(iso)
  if (!parsed) return ''
  return formatDistanceToNow(parsed, { addSuffix: true })
}

export const formatStatus = (status: Status) => {
  switch (status) {
    case 'active':
      return 'Active'
    case 'canceled':
      return 'Canceled'
    case 'archived':
      return 'Archived'
    case 'expired':
    default:
      return 'Expired'
  }
}

export const formatMonthLabel = (iso: string) => {
  const date = parseISO(iso)
  return format(date, 'MMM')
}
