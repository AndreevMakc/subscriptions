import type { ReactNode } from 'react'
import { InboxStackIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  actionTo?: string
  onAction?: () => void
  icon?: ReactNode
}

const EmptyState = ({ title, description, actionLabel, actionTo, onAction, icon }: EmptyStateProps) => {
  const resolvedIcon = icon ?? (
    <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/70 text-midnight/70">
      <InboxStackIcon aria-hidden="true" className="h-8 w-8" />
    </span>
  )

  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3 rounded-3xl p-10 text-center shadow-card">
      {resolvedIcon}
      <p className="text-section accent-dot text-midnight/60">{title}</p>
      <p className="max-w-sm text-sm text-midnight/70">{description}</p>
      {actionLabel ? (
        actionTo ? (
          <Link to={actionTo} className="pill-button bg-white/80 hover:bg-white/90" aria-label={actionLabel}>
            {actionLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAction}
            className="pill-button bg-white/80 hover:bg-white/90"
            aria-label={actionLabel}
          >
            {actionLabel}
          </button>
        )
      ) : null}
    </div>
  )
}

export default EmptyState
