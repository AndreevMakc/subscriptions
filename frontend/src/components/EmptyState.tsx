import type { PropsWithChildren, ReactNode } from 'react'

interface EmptyStateProps extends PropsWithChildren {
  title: string
  description: string
  action?: ReactNode
}

const EmptyState = ({ title, description, action, children }: EmptyStateProps) => {
  return (
    <div className="glass-card flex flex-col items-center justify-center gap-4 rounded-4xl px-8 py-12 text-center shadow-card-soft">
      <div className="rounded-full bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        {title}
      </div>
      <p className="max-w-xl text-sm text-slate-600">{description}</p>
      {children}
      {action}
    </div>
  )
}

export default EmptyState
