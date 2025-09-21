import type { Currency, Settings, Subscription } from '../types'

export const FX_TABLE: Record<Currency, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  RUB: 0.011,
  UAH: 0.026,
  KZT: 0.0022,
  BYN: 0.3,
}

export const formatMoney = (amount: number, currency: Currency, locale: Settings['locale'] = 'en'): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export const toUSD = (amount: number, currency: Currency): number => {
  const rate = FX_TABLE[currency] ?? 1
  return amount * rate
}

export const totalsPerCurrency = (subscriptions: Subscription[]): Map<Currency, number> => {
  return subscriptions.reduce((acc, subscription) => {
    const current = acc.get(subscription.currency) ?? 0
    acc.set(subscription.currency, current + subscription.price)
    return acc
  }, new Map<Currency, number>())
}

export const normalizeToUSD = (subscriptions: Subscription[]): number => {
  return subscriptions.reduce((acc, subscription) => acc + toUSD(subscription.price, subscription.currency), 0)
}
