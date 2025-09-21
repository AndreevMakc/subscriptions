import { format, formatDistanceToNow, parseISO } from 'date-fns'
import type { Locale } from 'date-fns'
import { enUS, ru as ruLocale } from 'date-fns/locale'
import type { Currency, Settings } from '../types'
import { parseDate } from './dates'

export const formatMoney = (amount: number, currency: Currency, locale?: Settings['locale']) => {
  const resolvedLocale = locale ?? 'en'
  return new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

const DATE_FNS_LOCALES: Record<Settings['locale'], Locale> = {
  en: enUS,
  ru: ruLocale,
}

const resolveDateLocale = (locale?: Settings['locale']) => {
  if (!locale) return undefined
  return DATE_FNS_LOCALES[locale]
}

interface FormatDateOptions {
  locale?: Settings['locale']
  formatStr?: string
}

export const formatDate = (iso?: string | null, options: FormatDateOptions = {}) => {
  const parsed = parseDate(iso)
  if (!parsed) return '—'
  const { locale, formatStr } = options
  return format(parsed, formatStr ?? 'PPP', { locale: resolveDateLocale(locale) })
}

export const formatRelativeToNow = (iso?: string | null, locale?: Settings['locale']) => {
  const parsed = parseDate(iso)
  if (!parsed) return ''
  return formatDistanceToNow(parsed, { addSuffix: true, locale: resolveDateLocale(locale) })
}

export const formatMonthLabel = (iso: string, locale?: Settings['locale']) => {
  const date = parseISO(iso)
  return format(date, 'MMM', { locale: resolveDateLocale(locale) })
}
