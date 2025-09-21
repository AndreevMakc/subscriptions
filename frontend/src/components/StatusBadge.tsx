import clsx from 'clsx'
import type { Status } from '../types'
import { formatStatus } from '../utils/format'

const statusStyles: Record<Status, string> = {
  active: 'bg-emerald-100 text-emerald-700 ring-emerald-300/70',
  canceled: 'bg-slate-200 text-slate-700 ring-slate-300/80',
  expired: 'bg-amber-100 text-amber-700 ring-amber-300/70',
  archived: 'bg-violet-100 text-violet-700 ring-violet-300/70',
}

const StatusBadge = ({ status }: { status: Status }) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset',
        statusStyles[status],
      )}
    >
      <span className="h-2 w-2 rounded-full bg-current opacity-70" aria-hidden="true" />
      {formatStatus(status)}
    </span>
  )
}

export default StatusBadge
