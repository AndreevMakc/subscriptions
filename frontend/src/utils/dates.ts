import { addDays, differenceInCalendarDays, format, formatDistanceToNowStrict, isBefore, parseISO, startOfDay } from 'date-fns'
import type { Locale } from 'date-fns'
import { enUS, ru } from 'date-fns/locale'
import type { Settings, Subscription } from '../types'

const localeMap = {
  en: enUS,
  ru,
} satisfies Record<Settings['locale'], Locale>

export const parseDate = (value: string): Date => {
  return parseISO(value)
}

export const startOfToday = (): Date => {
  return startOfDay(new Date())
}

export const daysUntil = (value: string): number => {
  return differenceInCalendarDays(parseDate(value), startOfToday())
}

export const isExpired = (subscription: Subscription): boolean => {
  if (subscription.status === 'archived') {
    return false
  }
  return isBefore(parseDate(subscription.endAt), startOfToday())
}

export const isDueSoon = (subscription: Subscription, settings: Settings): boolean => {
  if (subscription.status === 'archived' || subscription.status === 'canceled') {
    return false
  }
  const now = new Date()
  if (subscription.nextReminderAt) {
    const snoozedUntil = parseDate(subscription.nextReminderAt)
    if (snoozedUntil > now) {
      return false
    }
  }
  const diff = differenceInCalendarDays(parseDate(subscription.endAt), startOfDay(now))
  return diff <= settings.reminderDaysBefore
}

export const isPastDue = (subscription: Subscription): boolean => {
  return parseDate(subscription.endAt) < new Date()
}

export const snoozeDate = (days = 7): string => {
  return addDays(new Date(), days).toISOString()
}

export const formatDate = (value: string, locale: Settings['locale'], options?: Intl.DateTimeFormatOptions, timezone?: string): string => {
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options,
    }).format(parseDate(value))
  } catch {
    return format(parseDate(value), 'dd MMM yyyy')
  }
}

export const formatRelativeToNow = (value: string, locale: Settings['locale']): string => {
  try {
    return formatDistanceToNowStrict(parseDate(value), {
      addSuffix: true,
      locale: localeMap[locale] ?? enUS,
    })
  } catch {
    return ''
  }
}
