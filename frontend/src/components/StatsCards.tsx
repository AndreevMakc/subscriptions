import { formatMoney } from '../utils/format'
import type { Currency, Settings, Subscription } from '../types'
import { normalizedTotalUsd, resolveStatus, totalsByCurrency } from '../utils/subscriptions'
import { FX_RATES } from '../utils/constants'

interface StatsCardsProps {
  subscriptions: Subscription[]
  settings: Settings
  remindersDue: number
}

const StatsCards = ({ subscriptions, settings, remindersDue }: StatsCardsProps) => {
  const totals = totalsByCurrency(subscriptions)
  const normalized = normalizedTotalUsd(subscriptions)
  const activeCount = subscriptions.filter((subscription) => resolveStatus(subscription) === 'active').length
  const archivedCount = subscriptions.filter((subscription) => resolveStatus(subscription) === 'archived').length

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article className="glass-card flex flex-col gap-3 rounded-3xl p-6">
        <p className="text-section accent-dot">Active lineup</p>
        <p className="text-4xl font-semibold">{activeCount}</p>
        <p className="text-xs text-midnight/70">{archivedCount} resting in the archive</p>
      </article>

      <article className="glass-card flex flex-col gap-3 rounded-3xl p-6">
        <p className="text-section accent-dot">Reminders</p>
        <p className="text-4xl font-semibold">{remindersDue}</p>
        <p className="text-xs text-midnight/70">Due soon or overdue based on your reminder window</p>
      </article>

      <article className="glass-card flex flex-col gap-3 rounded-3xl p-6">
        <p className="text-section accent-dot">Monthly spend</p>
        <ul className="space-y-1 text-sm text-midnight/80">
          {Object.entries(totals).map(([currency, total]) => (
            <li key={currency} className="flex items-center justify-between">
              <span className="uppercase tracking-[0.2em] text-midnight/50">{currency}</span>
              <span className="font-medium text-midnight">{formatMoney(total, currency as keyof typeof FX_RATES, settings.locale)}</span>
            </li>
          ))}
          {Object.keys(totals).length === 0 ? <li className="text-xs text-midnight/60">Add subscriptions to see totals.</li> : null}
        </ul>
      </article>

      <article className="glass-card flex flex-col gap-3 rounded-3xl p-6">
        <p className="text-section accent-dot">Normalized to USD</p>
        <p className="text-3xl font-semibold">{formatMoney(normalized, 'USD' as Currency, settings.locale)}</p>
        <p className="text-xs text-midnight/70">Using fixed FX table inside the app.</p>
      </article>
    </section>
  )
}

export default StatsCards
