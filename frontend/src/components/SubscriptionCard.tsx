import { Link } from 'react-router-dom'
import clsx from 'clsx'
import type { Settings, Subscription } from '../types'
import { formatDate, formatMoney, formatRelativeToNow } from '../utils/format'
import { daysUntil } from '../utils/dates'
import { resolveStatus } from '../utils/subscriptions'
import StatusBadge from './StatusBadge'

interface SubscriptionCardProps {
  subscription: Subscription
  settings: Settings
  onArchive?: (id: string) => void
  onRestore?: (id: string) => void
  onDelete?: (id: string) => void
}

const SubscriptionCard = ({ subscription, settings, onArchive, onRestore, onDelete }: SubscriptionCardProps) => {
  const status = resolveStatus(subscription)
  const dueIn = daysUntil(subscription.endAt)

  return (
    <article className="glass-card group flex flex-col gap-4 rounded-3xl p-6 transition">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-midnight">{subscription.name}</h3>
          <p className="text-xs uppercase tracking-[0.3em] text-midnight/50">
            {subscription.vendor || 'Vendor unknown'}
          </p>
        </div>
        <StatusBadge status={status} />
      </header>

      <div className="grid gap-3 text-sm text-midnight/80 md:grid-cols-2">
        <dl className="flex flex-col gap-1">
          <dt className="text-xs uppercase tracking-[0.2em] text-midnight/50">Monthly price</dt>
          <dd className="text-base font-medium text-midnight">
            {formatMoney(subscription.price, subscription.currency, settings.locale)}
          </dd>
        </dl>
        <dl className="flex flex-col gap-1">
          <dt className="text-xs uppercase tracking-[0.2em] text-midnight/50">Next renewal</dt>
          <dd>
            <span className="font-medium text-midnight">{formatDate(subscription.endAt)}</span>
            {dueIn !== null ? (
              <span className="ml-2 text-xs uppercase tracking-wide text-midnight/60">
                {dueIn < 0 ? `${Math.abs(dueIn)} days past` : `${dueIn} days`}
              </span>
            ) : null}
          </dd>
          <dd className="text-xs text-midnight/60">{formatRelativeToNow(subscription.endAt)}</dd>
        </dl>
        {subscription.category ? (
          <dl className="flex flex-col gap-1">
            <dt className="text-xs uppercase tracking-[0.2em] text-midnight/50">Category</dt>
            <dd className="font-medium text-midnight">{subscription.category}</dd>
          </dl>
        ) : null}
        {subscription.notes ? (
          <dl className="flex flex-col gap-1 md:col-span-2">
            <dt className="text-xs uppercase tracking-[0.2em] text-midnight/50">Notes</dt>
            <dd className="text-sm text-midnight/70">{subscription.notes}</dd>
          </dl>
        ) : null}
      </div>

      <footer className="flex flex-wrap items-center gap-3 pt-2">
        <Link to={`/subscriptions/${subscription.id}/edit`} className="pill-button bg-white/70">
          Edit
        </Link>
        {status !== 'archived' ? (
          <button type="button" className="pill-button" onClick={() => onArchive?.(subscription.id)}>
            Archive
          </button>
        ) : (
          <button type="button" className="pill-button" onClick={() => onRestore?.(subscription.id)}>
            Restore
          </button>
        )}
        <button
          type="button"
          className={clsx(
            'pill-button',
            'bg-white/40 text-midnight/70 hover:bg-white/70 focus-visible:outline-red-500',
          )}
          onClick={() => onDelete?.(subscription.id)}
        >
          Delete
        </button>
      </footer>
    </article>
  )
}

export default SubscriptionCard
