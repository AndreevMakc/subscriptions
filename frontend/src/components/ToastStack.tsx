import { useEffect } from 'react'
import clsx from 'clsx'
import type { ToastMessage, ToastVariant } from '../store/useStore'
import { selectToasts, useStore } from '../store/useStore'
import { useI18n } from '../i18n'

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-emerald-300/60 bg-emerald-100/90 text-emerald-900 shadow-card',
  info: 'border-sky-200/70 bg-sky-100/90 text-sky-900 shadow-card',
  error: 'border-rose-200/70 bg-rose-100/90 text-rose-900 shadow-card',
}

const ToastCard = ({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) => {
  const { t } = useI18n()
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), 6000)
    return () => window.clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
      className={clsx(
        'glass-card flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-card backdrop-blur-xl',
        variantStyles[toast.variant],
      )}
    >
      <div className="flex-1">
        <p className="font-semibold">{toast.title}</p>
        {toast.description ? <p className="mt-1 text-xs opacity-80">{toast.description}</p> : null}
      </div>
      <button
        type="button"
        className="focus-ring rounded-full border border-transparent bg-white/50 px-2 py-1 text-[11px] font-semibold uppercase text-midnight/70"
        onClick={() => onDismiss(toast.id)}
      >
        {t('toast.close')}
      </button>
    </div>
  )
}

const ToastStack = () => {
  const toasts = useStore(selectToasts)
  const dismissToast = useStore((state) => state.dismissToast)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-[320px] flex-col gap-3 sm:right-10">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastCard toast={toast} onDismiss={dismissToast} />
        </div>
      ))}
    </div>
  )
}

export default ToastStack
