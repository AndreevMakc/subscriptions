import { formatMoney } from '../utils/format'
import type { Currency, Settings, Subscription } from '../types'
import { normalizedTotalUsd, resolveStatus, totalsByCurrency } from '../utils/subscriptions'
import { FX_RATES } from '../utils/constants'
import { useI18n } from '../i18n'

interface StatsCardsProps {
  subscriptions: Subscription[]
  settings: Settings
  remindersDue: number
}

const StatsCards = ({ subscriptions, settings, remindersDue }: StatsCardsProps) => {
  const { t } = useI18n()
  const totals = totalsByCurrency(subscriptions)
  const normalized = normalizedTotalUsd(subscriptions)
  const activeCount = subscriptions.filter((subscription) => resolveStatus(subscription) === 'active').length
  const archivedCount = subscriptions.filter((subscription) => resolveStatus(subscription) === 'archived').length

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article className="glass-card flex flex-col gap-3 rounded-3xl p-6">
        <p className="text-section accent-dot">{t('stats.activeLineup')}</p>
        <p className="text-4xl font-semibold">{activeCount}</p>
        <p className="text-xs text-midnight/70">{t('stats.archivedCount', { count: archivedCount })}</p>
      </article>

      <article className="glass-card flex flex-col gap-3 rounded-3xl p-6">
        <p className="text-section accent-dot">{t('stats.reminders')}</p>
        <p className="text-4xl font-semibold">{remindersDue}</p>
        <p className="text-xs text-midnight/70">{t('stats.remindersDescription')}</p>
      </article>

      <article className="glass-card flex flex-col gap-3 rounded-3xl p-6">
        <p className="text-section accent-dot">{t('stats.monthlySpend')}</p>
        <ul className="space-y-1 text-sm text-midnight/80">
          {Object.entries(totals).map(([currency, total]) => (
            <li key={currency} className="flex items-center justify-between">
              <span className="uppercase tracking-[0.2em] text-midnight/50">{currency}</span>
              <span className="font-medium text-midnight">{formatMoney(total, currency as keyof typeof FX_RATES, settings.locale)}</span>
            </li>
          ))}
          {Object.keys(totals).length === 0 ? (
            <li className="text-xs text-midnight/60">{t('stats.monthlySpendEmpty')}</li>
          ) : null}
        </ul>
      </article>

      <article className="glass-card flex flex-col gap-3 rounded-3xl p-6">
        <p className="text-section accent-dot">{t('stats.normalized')}</p>
        <p className="text-3xl font-semibold">{formatMoney(normalized, 'USD' as Currency, settings.locale)}</p>
        <p className="text-xs text-midnight/70">{t('stats.normalizedDescription')}</p>
      </article>
    </section>
  )
}

export default StatsCards
