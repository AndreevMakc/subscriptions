import {
  addMonths,
  differenceInMinutes,
  formatISO,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns'
import type { Settings, Subscription, Status } from '../types'
import { FX_RATES } from './constants'
import { createSnoozeDate, daysUntil, isDueSoonDate, isPast, isReminderDue, parseDate } from './dates'

export const resolveStatus = (subscription: Subscription): Status => {
  if (subscription.status === 'archived') return 'archived'
  if (subscription.status === 'canceled') return 'canceled'
  return isPast(subscription.endAt) ? 'expired' : 'active'
}

export const shouldShowInReminders = (subscription: Subscription, settings: Settings) => {
  const status = resolveStatus(subscription)
  if (status === 'archived' || status === 'canceled') return false
  if (!subscription.endAt) return false

  if (isPast(subscription.endAt)) return true

  if (subscription.nextReminderAt && isReminderDue(subscription.nextReminderAt)) {
    return true
  }

  return isDueSoonDate(subscription.endAt, settings.reminderDaysBefore)
}

export const getReminderSortKey = (subscription: Subscription) => {
  const reminderDate = subscription.nextReminderAt ?? subscription.endAt
  return parseDate(reminderDate)?.getTime() ?? Number.POSITIVE_INFINITY
}

export interface SubscriptionFilters {
  text?: string
  status?: 'all' | Status
  category?: string
  vendor?: string
  minPrice?: number
  maxPrice?: number
}

export type SubscriptionSort = 'nextDue' | 'priceAsc' | 'priceDesc' | 'name' | 'createdAt'

export const filterSubscriptions = (
  subscriptions: Subscription[],
  filters: SubscriptionFilters,
  includeArchived = false,
) => {
  const text = filters.text?.trim().toLowerCase()
  return subscriptions.filter((subscription) => {
    const status = resolveStatus(subscription)
    if (!includeArchived && status === 'archived') return false

    if (filters.status && filters.status !== 'all' && status !== filters.status) return false
    if (filters.category && subscription.category !== filters.category) return false
    if (filters.vendor && subscription.vendor !== filters.vendor) return false
    if (typeof filters.minPrice === 'number' && subscription.price < filters.minPrice) return false
    if (typeof filters.maxPrice === 'number' && subscription.price > filters.maxPrice) return false

    if (text) {
      const haystack = [
        subscription.name,
        subscription.vendor,
        subscription.category,
        subscription.notes,
      ]
        .filter(Boolean)
        .join(' ') // string
        .toLowerCase()
      if (!haystack.includes(text)) return false
    }

    return true
  })
}

export const sortSubscriptions = (subscriptions: Subscription[], sort: SubscriptionSort) => {
  const copy = [...subscriptions]
  return copy.sort((a, b) => {
    switch (sort) {
      case 'nextDue': {
        const aDate = getReminderSortKey(a)
        const bDate = getReminderSortKey(b)
        return aDate - bDate
      }
      case 'priceAsc':
        return a.price - b.price
      case 'priceDesc':
        return b.price - a.price
      case 'name':
        return a.name.localeCompare(b.name)
      case 'createdAt':
      default:
        return parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime()
    }
  })
}

export const totalsByCurrency = (subscriptions: Subscription[]) => {
  return subscriptions.reduce<Record<string, number>>((acc, subscription) => {
    const status = resolveStatus(subscription)
    if (status === 'archived' || status === 'canceled') return acc
    acc[subscription.currency] =
      (acc[subscription.currency] ?? 0) + Number.parseFloat(subscription.price.toFixed(2))
    return acc
  }, {})
}

export const normalizedTotalUsd = (subscriptions: Subscription[]) => {
  return subscriptions.reduce((total, subscription) => {
    const status = resolveStatus(subscription)
    if (status === 'archived' || status === 'canceled') return total
    return total + subscription.price * FX_RATES[subscription.currency]
  }, 0)
}

export interface SparklinePoint {
  month: string
  total: number
}

export const monthlySparkline = (subscriptions: Subscription[]): SparklinePoint[] => {
  const months: SparklinePoint[] = []
  const start = startOfMonth(subMonths(new Date(), 11))
  for (let i = 0; i < 12; i += 1) {
    const monthDate = addMonths(start, i)
    const iso = formatISO(monthDate, { representation: 'date' })
    const total = subscriptions.reduce((sum, subscription) => {
      const status = resolveStatus(subscription)
      if (status === 'archived' || status === 'canceled') return sum
      const endDate = parseDate(subscription.endAt)
      if (!endDate) return sum
      const sameMonth =
        endDate.getFullYear() === monthDate.getFullYear() &&
        endDate.getMonth() === monthDate.getMonth()
      if (!sameMonth) return sum
      return sum + subscription.price * FX_RATES[subscription.currency]
    }, 0)
    months.push({ month: iso, total: Number(total.toFixed(2)) })
  }
  return months
}

export const computeReminderState = (subscription: Subscription, settings: Settings) => {
  const status = resolveStatus(subscription)
  const dueDate = subscription.nextReminderAt ?? subscription.endAt
  const dueIn = dueDate ? daysUntil(dueDate) : null
  const overdueMinutes = dueDate ? differenceInMinutes(new Date(), parseISO(dueDate)) : null
  const overdue = overdueMinutes !== null && overdueMinutes > 0
  return {
    status,
    dueDate,
    dueIn,
    overdue,
    snoozeTo: createSnoozeDate(),
    show: shouldShowInReminders(subscription, settings),
  }
}

export const categoriesFrom = (subscriptions: Subscription[]) => {
  return Array.from(
    new Set(
      subscriptions
        .map((subscription) => subscription.category)
        .filter((value): value is string => Boolean(value && value.trim().length > 0)),
    ),
  ).sort((a, b) => a.localeCompare(b))
}

export const vendorsFrom = (subscriptions: Subscription[]) => {
  return Array.from(
    new Set(
      subscriptions
        .map((subscription) => subscription.vendor)
        .filter((value): value is string => Boolean(value && value.trim().length > 0)),
    ),
  ).sort((a, b) => a.localeCompare(b))
}
