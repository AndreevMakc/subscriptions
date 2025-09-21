import clsx from 'clsx'
import type { Status } from '../types'

const statusStyles: Record<Status, string> = {
  active: 'bg-emerald-100/80 text-emerald-700 border-emerald-200',
  canceled: 'bg-amber-100/70 text-amber-700 border-amber-200',
  expired: 'bg-rose-100/70 text-rose-700 border-rose-200',
  archived: 'bg-slate-200/60 text-slate-600 border-slate-300',
}

const statusLabels: Record<Status, string> = {
  active: 'Active',
  canceled: 'Canceled',
  expired: 'Expired',
  archived: 'Archived',
}

interface StatusBadgeProps {
  status: Status
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em]',
        statusStyles[status],
      )}
    >
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
      {statusLabels[status]}
    </span>
  )
}

export default StatusBadge
