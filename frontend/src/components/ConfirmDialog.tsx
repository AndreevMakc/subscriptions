import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const { t } = useI18n()
  const resolvedConfirmLabel = confirmLabel ?? t('confirm.confirm')
  const resolvedCancelLabel = cancelLabel ?? t('confirm.cancel')

  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? 'confirm-dialog-description' : undefined}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-midnight/20 backdrop-blur-sm"
    >
      <div className="glass-card w-full max-w-sm rounded-3xl border border-white/60 bg-white/80 p-6 shadow-card">
        <p id="confirm-dialog-title" className="text-section accent-dot mb-2">
          {title}
        </p>
        {description ? (
          <p id="confirm-dialog-description" className="text-sm text-midnight/70">
            {description}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="pill-button bg-white/70"
            onClick={onCancel}
            aria-label={resolvedCancelLabel}
          >
            {resolvedCancelLabel}
          </button>
          <button
            type="button"
            className="pill-button bg-accent text-white shadow-card hover:bg-accent/90"
            onClick={onConfirm}
            aria-label={resolvedConfirmLabel}
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ConfirmDialog
