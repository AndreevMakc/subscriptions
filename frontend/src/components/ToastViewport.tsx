import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { useStore } from '../store/useStore'

const toneStyles = {
  success: 'border-emerald-400/70 bg-emerald-100/80 text-emerald-800',
  info: 'border-accent/60 bg-white/80 text-midnight',
  error: 'border-rose-400/70 bg-rose-100/80 text-rose-700',
} as const

const ToastViewport = () => {
  const toasts = useStore((state) => state.ui.toasts)
  const dismissToast = useStore((state) => state.dismissToast)

  useEffect(() => {
    const timers = toasts.map((toast) => setTimeout(() => dismissToast(toast.id), 5000))
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [toasts, dismissToast])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="pointer-events-none fixed bottom-8 right-8 z-50 flex w-80 flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={clsx(
            'pointer-events-auto rounded-3xl border px-5 py-4 shadow-card backdrop-blur-lg transition hover:shadow-card-soft',
            toneStyles[toast.tone ?? 'info'],
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide">{toast.title}</p>
              {toast.description ? (
                <p className="text-xs opacity-80">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="rounded-full bg-white/60 px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-inner-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/40"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>,
    document.body,
  )
}

export default ToastViewport
