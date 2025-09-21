import clsx from 'clsx'
import { Link } from 'react-router-dom'
import type { Settings, Status, Subscription } from '../types'
import { daysUntil, formatDate, formatRelativeToNow, isPastDue } from '../utils/dates'
import { formatMoney } from '../utils/money'
import StatusBadge from './StatusBadge'

interface SubscriptionCardProps {
  subscription: Subscription
  status: Status
  settings: Settings
  highlightDue?: boolean
  onArchive?: (id: string) => void
  onRestore?: (id: string) => void
  onRemove?: (id: string) => void
  onSnooze?: (id: string) => void
}

const SubscriptionCard = ({
  subscription,
  status,
  settings,
  highlightDue,
  onArchive,
  onRestore,
  onRemove,
  onSnooze,
}: SubscriptionCardProps) => {
  const renewalLabel = formatDate(subscription.endAt, settings.locale, undefined, settings.timezone)
  const relative = formatRelativeToNow(subscription.endAt, settings.locale)
  const dueIn = daysUntil(subscription.endAt)
  const pastDue = isPastDue(subscription)

  const showSnooze = Boolean(onSnooze) && status !== 'archived' && status !== 'canceled'

  return (
    <article
      className={clsx(
        'glass-card group flex flex-col gap-5 rounded-4xl p-6 transition-transform duration-300 ease-out hover:-translate-y-1 hover:shadow-card-soft',
        highlightDue && 'ring-2 ring-accent/40',
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-label">{subscription.category ?? 'Uncategorized'}</p>
          <h3 className="text-2xl font-semibold text-midnight">{subscription.name}</h3>
          {subscription.vendor ? <p className="text-sm text-slate-500">{subscription.vendor}</p> : null}
        </div>
        <StatusBadge status={status} />
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl bg-white/60 p-4 shadow-inner-sm">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Monthly cost</p>
          <p className="mt-2 text-xl font-semibold text-midnight">{formatMoney(subscription.price, subscription.currency, settings.locale)}</p>
        </div>
        <div className="rounded-3xl bg-white/60 p-4 shadow-inner-sm">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Renews</p>
          <p className="mt-2 text-lg font-semibold text-midnight">{renewalLabel}</p>
          <p className="text-xs text-slate-500">{relative}</p>
        </div>
        <div className="rounded-3xl bg-white/60 p-4 shadow-inner-sm">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Status</p>
          <p className="mt-2 text-lg font-semibold text-midnight capitalize">{status}</p>
          <p className="text-xs text-slate-500">
            {pastDue ? 'Past due' : `Due in ${dueIn} day${Math.abs(dueIn) === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="rounded-3xl bg-white/60 p-4 shadow-inner-sm">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Reminder</p>
          <p className="mt-2 text-lg font-semibold text-midnight">
            {subscription.nextReminderAt
              ? formatDate(subscription.nextReminderAt, settings.locale, undefined, settings.timezone)
              : 'Auto'}
          </p>
          <p className="text-xs text-slate-500">
            {subscription.nextReminderAt ? formatRelativeToNow(subscription.nextReminderAt, settings.locale) : 'Based on settings'}
          </p>
        </div>
      </div>
      {subscription.notes ? (
        <div className="rounded-3xl bg-white/50 p-4 text-sm text-slate-600 shadow-inner-sm">
          {subscription.notes}
        </div>
      ) : null}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/60 pt-4 text-sm">
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
          <span>Created {formatDate(subscription.createdAt, settings.locale, undefined, settings.timezone)}</span>
          <span className="hidden h-1 w-1 rounded-full bg-slate-400 sm:inline-flex" aria-hidden />
          <span>Updated {formatDate(subscription.updatedAt, settings.locale, undefined, settings.timezone)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/subscriptions/${subscription.id}/edit`}
            className="pill-button bg-white/70 text-midnight hover:bg-white"
          >
            Edit
          </Link>
          {showSnooze ? (
            <button
              type="button"
              className="pill-button bg-white/70 text-midnight hover:bg-white"
              onClick={() => onSnooze?.(subscription.id)}
            >
              Snooze 7d
            </button>
          ) : null}
          {status === 'archived' ? (
            <button
              type="button"
              className="pill-button bg-emerald-100/80 text-emerald-700 hover:bg-emerald-100"
              onClick={() => onRestore?.(subscription.id)}
            >
              Restore
            </button>
          ) : (
            <>
              {onArchive ? (
                <button
                  type="button"
                  className="pill-button bg-white/70 text-midnight hover:bg-white"
                  onClick={() => onArchive(subscription.id)}
                >
                  Archive
                </button>
              ) : null}
              {onRemove ? (
                <button
                  type="button"
                  className="pill-button bg-rose-200/70 text-rose-700 hover:bg-rose-200"
                  onClick={() => onRemove(subscription.id)}
                >
                  Delete
                </button>
              ) : null}
            </>
          )}
        </div>
      </footer>
    </article>
  )
}

export default SubscriptionCard
