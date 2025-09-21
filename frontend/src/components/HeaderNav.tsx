import { useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { persistedStateSchema } from '../utils/validation'
import { selectSettings, selectSubscriptions, useStore } from '../store/useStore'
import type { PersistedState } from '../types'
import { useI18n, type TranslationKey } from '../i18n'

const navItems: { to: string; key: TranslationKey }[] = [
  { to: '/', key: 'nav.dashboard' },
  { to: '/subscriptions', key: 'nav.subscriptions' },
  { to: '/archive', key: 'nav.archive' },
  { to: '/settings', key: 'nav.settings' },
]

const HeaderNav = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const subscriptions = useStore(selectSubscriptions)
  const settings = useStore(selectSettings)
  const importData = useStore((state) => state.importData)
  const recomputeStatuses = useStore((state) => state.recomputeStatuses)
  const pushToast = useStore((state) => state.pushToast)
  const location = useLocation()
  const { t } = useI18n()

  const handleExport = () => {
    const data: PersistedState = {
      subscriptions: subscriptions.map((subscription) => ({ ...subscription })),
      settings: { ...settings },
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `subskeeper-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    pushToast({
      title: t('nav.exportReady.title'),
      description: t('nav.exportReady.description'),
      variant: 'success',
    })
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImport: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const data = persistedStateSchema.parse(parsed) as PersistedState
      importData(data)
      recomputeStatuses()
      pushToast({
        title: t('nav.importComplete.title'),
        description: t('nav.importComplete.description'),
        variant: 'success',
      })
    } catch (error) {
      console.error(error)
      pushToast({
        title: t('nav.importFailed.title'),
        description: t('nav.importFailed.description'),
        variant: 'error',
      })
    } finally {
      event.target.value = ''
    }
  }

  return (
    <header className="glass-card mb-8 flex flex-col gap-6 rounded-card border border-white/60 bg-white/70 p-6 shadow-card backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
      <div>
        <NavLink to="/" className="flex items-center gap-3 text-lg font-semibold tracking-wide">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-midnight shadow-inner-soft">
            SK
          </span>
          <span>
            <span className="block text-sm uppercase tracking-[0.4em] text-midnight/60">SubsKeeper</span>
            <span className="block text-base font-semibold leading-tight text-midnight">{t('nav.tagline')}</span>
          </span>
        </NavLink>
      </div>

      <nav className="flex flex-wrap items-center gap-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'pill-button !px-4 !py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-white/80 shadow-card text-midnight'
                  : 'bg-white/40 text-midnight/80 hover:text-midnight',
              )
            }
            end={item.to === '/'}
          >
            {t(item.key)}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="pill-button" onClick={handleImportClick}>
          {t('nav.importJson')}
        </button>
        <button type="button" className="pill-button" onClick={handleExport}>
          {t('nav.export')}
        </button>
        <NavLink
          to={{ pathname: '/subscriptions/new', search: location.search }}
          className="pill-button bg-accent text-white shadow-card hover:bg-accent/90"
        >
          {t('nav.addSubscription')}
        </NavLink>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="sr-only"
          onChange={handleImport}
          aria-label={t('import.ariaLabel')}
        />
      </div>
    </header>
  )
}

export default HeaderNav
