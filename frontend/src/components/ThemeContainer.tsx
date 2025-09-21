import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

interface ThemeContainerProps extends PropsWithChildren {
  className?: string
}

const ThemeContainer = ({ children, className }: ThemeContainerProps) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-app-gradient">
      <div className="pointer-events-none absolute -left-40 top-20 h-80 w-80 rounded-full bg-white/25 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-accent/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute inset-x-10 bottom-0 h-72 rounded-[4rem] bg-white/25 blur-3xl" aria-hidden />
      <div className={clsx('relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-10 pt-8 sm:px-6 lg:px-10', className)}>
        {children}
      </div>
    </div>
  )
}

export default ThemeContainer
