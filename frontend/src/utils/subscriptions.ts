import { compareAsc, compareDesc, format, parseISO } from 'date-fns'
import type { Settings, Status, Subscription } from '../types'
import { isDueSoon, isExpired as isExpiredByDate } from './dates'

export type SortOption = 'nextRenewal' | 'priceHigh' | 'priceLow' | 'name' | 'recent'

export interface SubscriptionFilters {
  status?: Status | 'all'
  category?: string
  vendor?: string
  search?: string
  minPrice?: number
  maxPrice?: number
  includeArchived?: boolean
}

export const computedStatus = (subscription: Subscription): Status => {
  if (subscription.status === 'archived') return 'archived'
  if (subscription.status === 'canceled') return 'canceled'
  if (isExpiredByDate(subscription)) return 'expired'
  return 'active'
}

export const shouldShowSubscription = (
  subscription: Subscription,
  filters: SubscriptionFilters,
): boolean => {
  const status = computedStatus(subscription)

  if (!filters.includeArchived && status === 'archived') {
    return false
  }

  if (filters.status && filters.status !== 'all' && status !== filters.status) {
    return false
  }

  if (filters.category && subscription.category) {
    if (subscription.category.toLowerCase() !== filters.category.toLowerCase()) return false
  } else if (filters.category) {
    return false
  }

  if (filters.vendor && subscription.vendor) {
    if (subscription.vendor.toLowerCase() !== filters.vendor.toLowerCase()) return false
  } else if (filters.vendor) {
    return false
  }

  if (typeof filters.minPrice === 'number' && subscription.price < filters.minPrice) {
    return false
  }

  if (typeof filters.maxPrice === 'number' && subscription.price > filters.maxPrice) {
    return false
  }

  if (filters.search) {
    const haystack = `${subscription.name} ${subscription.category ?? ''} ${subscription.vendor ?? ''} ${subscription.notes ?? ''}`
      .toLowerCase()
    if (!haystack.includes(filters.search.toLowerCase())) {
      return false
    }
  }

  if (filters.status === 'expired' && status === 'active') {
    return false
  }

  if (!filters.includeArchived && subscription.status === 'archived') {
    return false
  }

  return true
}

export const filterSubscriptions = (
  subscriptions: Subscription[],
  filters: SubscriptionFilters,
): Subscription[] => {
  return subscriptions.filter((subscription) => shouldShowSubscription(subscription, filters))
}

export const sortSubscriptions = (subscriptions: Subscription[], sort: SortOption): Subscription[] => {
  switch (sort) {
    case 'priceHigh':
      return [...subscriptions].sort((a, b) => b.price - a.price)
    case 'priceLow':
      return [...subscriptions].sort((a, b) => a.price - b.price)
    case 'name':
      return [...subscriptions].sort((a, b) => a.name.localeCompare(b.name))
    case 'recent':
      return [...subscriptions].sort((a, b) => compareDesc(parseISO(a.createdAt), parseISO(b.createdAt)))
    case 'nextRenewal':
    default:
      return [...subscriptions].sort((a, b) => compareAsc(parseISO(a.endAt), parseISO(b.endAt)))
  }
}

export const categoriesFromSubscriptions = (subscriptions: Subscription[]): string[] => {
  const categories = new Set<string>()
  subscriptions.forEach((subscription) => {
    if (subscription.category) {
      categories.add(subscription.category)
    }
  })
  return Array.from(categories).sort((a, b) => a.localeCompare(b))
}

export const vendorsFromSubscriptions = (subscriptions: Subscription[]): string[] => {
  const vendors = new Set<string>()
  subscriptions.forEach((subscription) => {
    if (subscription.vendor) {
      vendors.add(subscription.vendor)
    }
  })
  return Array.from(vendors).sort((a, b) => a.localeCompare(b))
}

export const remindersDue = (subscriptions: Subscription[], settings: Settings): Subscription[] => {
  return subscriptions.filter((subscription) => isDueSoon(subscription, settings) || isExpiredByDate(subscription))
}

export const activeSubscriptions = (subscriptions: Subscription[]): Subscription[] => {
  return subscriptions.filter((subscription) => {
    const status = computedStatus(subscription)
    return status === 'active'
  })
}

export const monthlySparklineData = (subscriptions: Subscription[]): { month: string; total: number }[] => {
  const now = new Date()
  const results: { month: string; total: number }[] = []
  for (let i = 11; i >= 0; i -= 1) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const total = subscriptions.reduce((acc, subscription) => {
      const created = parseISO(subscription.createdAt)
      const endDate = parseISO(subscription.endAt)
      if (created <= monthEnd && endDate >= monthStart) {
        return acc + subscription.price
      }
      return acc
    }, 0)
    results.push({ month: format(monthStart, 'MMM'), total: Number(total.toFixed(2)) })
  }
  return results
}
