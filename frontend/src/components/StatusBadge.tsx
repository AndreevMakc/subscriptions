import clsx from 'clsx'
import type { ComponentType, SVGProps } from 'react'
import { ArchiveBoxIcon, CheckCircleIcon, ClockIcon, NoSymbolIcon } from '@heroicons/react/20/solid'
import type { Status } from '../types'
import { useI18n } from '../i18n'

const statusIcons = {
  active: CheckCircleIcon,
  canceled: NoSymbolIcon,
  expired: ClockIcon,
  archived: ArchiveBoxIcon,
} as const satisfies Record<Status, ComponentType<SVGProps<SVGSVGElement>>>

const statusStyles: Record<Status, string> = {
  active: 'bg-emerald-100 text-emerald-700 ring-emerald-300/70',
  canceled: 'bg-slate-200 text-slate-700 ring-slate-300/80',
  expired: 'bg-amber-100 text-amber-700 ring-amber-300/70',
  archived: 'bg-violet-100 text-violet-700 ring-violet-300/70',
}

const StatusBadge = ({ status }: { status: Status }) => {
  const { t } = useI18n()
  const Icon = statusIcons[status]
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset',
        statusStyles[status],
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {t(`status.${status}`)}
    </span>
  )
}

export default StatusBadge
