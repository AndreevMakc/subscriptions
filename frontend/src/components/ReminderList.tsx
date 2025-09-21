import type { Settings, Subscription } from '../types'
import { daysUntil, formatDate, formatRelativeToNow, isPastDue } from '../utils/dates'
import { formatMoney } from '../utils/money'

interface ReminderListProps {
  items: Subscription[]
  settings: Settings
  onSnooze: (id: string) => void
}

const ReminderList = ({ items, settings, onSnooze }: ReminderListProps) => {
  return (
    <section className="glass-card rounded-4xl p-6 shadow-card-soft">
      <div className="mb-4 flex items-center justify-between">
        <p className="section-label">Reminders</p>
        <p className="text-xs text-slate-500">Snooze gives you a 7 day breather.</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-3xl bg-white/60 p-6 text-sm text-slate-500">
          You’re all caught up! No reminders due.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((subscription) => {
            const dueIn = daysUntil(subscription.endAt)
            const relative = formatRelativeToNow(subscription.endAt, settings.locale)
            const dueLabel = isPastDue(subscription)
              ? `Expired ${relative}`
              : dueIn === 0
                ? 'Renews today'
                : `Renews ${relative}`

            return (
              <li
                key={subscription.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/60 bg-white/70 px-5 py-4 shadow-inner-sm"
              >
                <div>
                  <p className="font-semibold text-midnight">{subscription.name}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    {formatDate(subscription.endAt, settings.locale, undefined, settings.timezone)} · {dueLabel}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatMoney(subscription.price, subscription.currency, settings.locale)}
                  </p>
                </div>
                <button
                  type="button"
                  className="pill-button bg-white/80 text-midnight hover:bg-white"
                  onClick={() => onSnooze(subscription.id)}
                >
                  Snooze 7 days
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default ReminderList
