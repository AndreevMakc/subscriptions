interface LoadingStateProps {
  message?: string
}

const LoadingState = ({ message = 'Loading...' }: LoadingStateProps) => {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="glass-card flex items-center gap-4 rounded-4xl px-8 py-6">
        <span className="inline-flex h-10 w-10 animate-spin items-center justify-center rounded-full border-2 border-accent/60 border-t-transparent" aria-hidden />
        <div className="text-left">
          <p className="text-sm font-medium uppercase tracking-widest text-slate-500">SubsKeeper</p>
          <p className="text-lg font-semibold text-midnight">{message}</p>
        </div>
      </div>
    </div>
  )
}

export default LoadingState
