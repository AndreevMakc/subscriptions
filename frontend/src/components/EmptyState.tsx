import type { ReactNode } from 'react'
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

  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3 rounded-3xl p-10 text-center shadow-card">
      {icon}
      <p className="text-section accent-dot text-midnight/60">{title}</p>
      <p className="max-w-sm text-sm text-midnight/70">{description}</p>
      {actionLabel ? (
        actionTo ? (
          <Link to={actionTo} className="pill-button bg-white/80 hover:bg-white/90">
            {actionLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAction}
            className="pill-button bg-white/80 hover:bg-white/90"
          >
            {actionLabel}
          </button>
        )
      ) : null}
    </div>
  )
}

export default EmptyState
