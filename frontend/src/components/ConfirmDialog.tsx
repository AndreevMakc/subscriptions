import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store/useStore'

const ConfirmDialogHost = () => {
  const confirm = useStore((state) => state.ui.confirm)
  const setConfirm = useStore((state) => state.setConfirm)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!confirm) return undefined
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setConfirm(null)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [confirm, setConfirm])

  useEffect(() => {
    if (confirm && dialogRef.current) {
      const firstButton = dialogRef.current.querySelector('button') as HTMLButtonElement | null
      firstButton?.focus()
    }
  }, [confirm])

  if (!confirm || typeof document === 'undefined') {
    return null
  }

  const handleCancel = () => {
    confirm.onCancel?.()
    setConfirm(null)
  }

  const handleConfirm = () => {
    confirm.onConfirm()
    setConfirm(null)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          setConfirm(null)
        }
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`confirm-title-${confirm.id}`}
        aria-describedby={`confirm-description-${confirm.id}`}
        className="glass-card w-full max-w-md rounded-4xl px-8 py-8 shadow-card-soft"
      >
        <p id={`confirm-title-${confirm.id}`} className="mb-2 text-lg font-semibold text-midnight">
          {confirm.title}
        </p>
        {confirm.description ? (
          <p id={`confirm-description-${confirm.id}`} className="mb-6 text-sm text-slate-600">
            {confirm.description}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="pill-button bg-white/80 text-midnight hover:bg-white"
            onClick={handleCancel}
          >
            {confirm.cancelLabel ?? 'Cancel'}
          </button>
          <button
            type="button"
            className="pill-button bg-accent/80 text-white shadow-card hover:bg-accent"
            onClick={handleConfirm}
          >
            {confirm.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ConfirmDialogHost
