import { Link } from 'react-router-dom'
import type { Settings, Subscription } from '../types'
import { computeReminderState, getReminderSortKey } from '../utils/subscriptions'
import { formatDate, formatRelativeToNow } from '../utils/format'
import StatusBadge from './StatusBadge'

interface ReminderListProps {
  subscriptions: Subscription[]
  settings: Settings
  onSnooze: (id: string) => void
  onClearReminder: (id: string) => void
}

const ReminderList = ({ subscriptions, settings, onSnooze, onClearReminder }: ReminderListProps) => {
  const reminders = subscriptions
    .map((subscription) => ({ subscription, state: computeReminderState(subscription, settings) }))
    .filter((item) => item.state.show)
    .sort((a, b) => getReminderSortKey(a.subscription) - getReminderSortKey(b.subscription))

  if (reminders.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-6 text-sm text-midnight/70">
        All caught up! Adjust your reminder window in settings to see upcoming renewals.
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {reminders.map(({ subscription, state }) => (
        <li key={subscription.id} className="glass-card flex flex-col gap-3 rounded-3xl p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-midnight">{subscription.name}</p>
              <p className="text-xs uppercase tracking-[0.3em] text-midnight/50">
                {subscription.vendor || 'Vendor unknown'}
              </p>
            </div>
            <StatusBadge status={state.status} />
          </div>
          <div className="flex flex-col gap-2 text-sm text-midnight/70 sm:flex-row sm:items-center sm:justify-between">
            <p>
              <span className="font-medium text-midnight">Due {formatDate(state.dueDate)}</span>
              {state.dueIn !== null ? (
                <span className="ml-2 rounded-full bg-white/60 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-midnight/70">
                  {state.dueIn < 0 ? `${Math.abs(state.dueIn)} days overdue` : `${state.dueIn} days left`}
                </span>
              ) : null}
            </p>
            <span className="text-xs text-midnight/60">{formatRelativeToNow(state.dueDate)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to={`/subscriptions/${subscription.id}/edit`} className="pill-button bg-white/70">
              Review
            </Link>
            <button
              type="button"
              className="pill-button"
              onClick={() => onSnooze(subscription.id)}
            >
              Snooze 7 days
            </button>
            {subscription.nextReminderAt ? (
              <button
                type="button"
                className="pill-button"
                onClick={() => onClearReminder(subscription.id)}
              >
                Clear snooze
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

export default ReminderList
