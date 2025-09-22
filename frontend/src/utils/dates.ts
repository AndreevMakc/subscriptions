import {
  addDays,
  differenceInCalendarDays,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
} from 'date-fns'

export const startOfToday = () => startOfDay(new Date())

export const parseDate = (value?: string | null) => {
  if (!value) return null
  try {
    return parseISO(value)
  } catch {
    return null
  }
}

export const daysUntil = (isoDate?: string | null) => {
  const date = parseDate(isoDate)
  if (!date) return null

  return differenceInCalendarDays(date, startOfToday())
}

export const isPast = (isoDate?: string | null) => {
  const date = parseDate(isoDate)
  if (!date) return false
  return isBefore(date, startOfToday())
}

export const isDueSoonDate = (isoDate: string | undefined, withinDays: number) => {
  const diff = daysUntil(isoDate)
  if (diff === null) return false
  return diff <= withinDays
}

export const isReminderDue = (isoDate?: string | null) => {
  const date = parseDate(isoDate)
  if (!date) return false
  return !isAfter(date, new Date())
}

export const createSnoozeDate = (days = 7) => addDays(new Date(), days).toISOString()

export const toDateInputValue = (iso?: string | null) => {
  const date = parseDate(iso)
  if (!date) return ''
  const pad = (value: number) => value.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const fromDateInputValue = (value?: string | null, timezone?: string) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  if (timezone && typeof Intl !== 'undefined' && 'DateTimeFormat' in Intl) {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      const parts = formatter.formatToParts(date)
      const year = parts.find((part) => part.type === 'year')?.value ?? `${date.getFullYear()}`
      const month = parts.find((part) => part.type === 'month')?.value ?? `${date.getMonth() + 1}`
      const day = parts.find((part) => part.type === 'day')?.value ?? `${date.getDate()}`
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`
    } catch {
      return new Date(value).toISOString()
    }
  }

  return new Date(value).toISOString()
}
