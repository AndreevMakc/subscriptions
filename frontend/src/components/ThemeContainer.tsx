import type { PropsWithChildren } from 'react'

const ThemeContainer = ({ children }: PropsWithChildren) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-peach via-blush to-lavender text-midnight">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[420px] bg-aurora" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  )
}

export default ThemeContainer
