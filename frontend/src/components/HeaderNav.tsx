import { useRef, type SVGProps } from 'react'
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
]

const SettingsIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12a2.25 2.25 0 01-1.6 2.154c-.129.041-.26.078-.39.113a8.262 8.262 0 01-.869 1.819c.06.164.115.329.164.495A2.25 2.25 0 0117.25 18h-.007a2.251 2.251 0 01-2.139-1.588c-.169-.05-.338-.105-.507-.164a8.256 8.256 0 01-1.819.869c-.035.13-.072.261-.113.39A2.25 2.25 0 019 21a2.25 2.25 0 01-2.154-1.6c-.041-.129-.078-.26-.113-.39a8.262 8.262 0 01-1.819-.869 11.42 11.42 0 01-.495-.164A2.25 2.25 0 013 17.25v-.007a2.251 2.251 0 011.588-2.139c.05-.169.105-.338.164-.507a8.256 8.256 0 01-.869-1.819 6.589 6.589 0 01-.39-.113A2.25 2.25 0 013 9c0-1.012.668-1.87 1.6-2.154.129-.041.26-.078.39-.113.243-.63.53-1.237.869-1.819a5.324 5.324 0 01-.164-.495A2.25 2.25 0 016.75 3h.007a2.251 2.251 0 012.139 1.588c.169.05.338.105.507.164.557-.37 1.179-.669 1.819-.869.035-.13.072-.261.113-.39A2.25 2.25 0 0115 3c1.012 0 1.87.668 2.154 1.6.041.129.078.26.113.39.63.243 1.237.53 1.819.869.164-.06.329-.115.495-.164A2.25 2.25 0 0121 9c0 1.012-.668 1.87-1.6 2.154.05.169.105.338.164.507.37.557.669 1.179.869 1.819.13.035.261.072.39.113A2.25 2.25 0 0121 12z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

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
    <header className="glass-card mb-8 flex flex-col gap-6 rounded-card border border-white/60 bg-white/70 p-6 shadow-card backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:gap-8">
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

      <div className="flex w-full flex-nowrap items-center gap-3 overflow-x-auto sm:w-auto sm:justify-end">
        <nav className="flex flex-nowrap items-center gap-3 flex-shrink-0">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'pill-button !px-4 !py-2 text-sm font-medium transition whitespace-nowrap flex-shrink-0',
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

        <div className="flex flex-nowrap items-center gap-3 flex-shrink-0">
          <button type="button" className="pill-button whitespace-nowrap flex-shrink-0" onClick={handleImportClick}>
            {t('nav.importJson')}
          </button>
          <button type="button" className="pill-button whitespace-nowrap flex-shrink-0" onClick={handleExport}>
            {t('nav.export')}
          </button>
          <NavLink
            to={{ pathname: '/subscriptions/new', search: location.search }}
            className="pill-button whitespace-nowrap bg-accent text-white shadow-card hover:bg-accent/90 flex-shrink-0"
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

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(
              'pill-button !p-2 text-midnight transition flex-shrink-0',
              isActive
                ? 'bg-white/80 shadow-card text-midnight'
                : 'bg-white/40 text-midnight/80 hover:text-midnight',
            )
          }
          aria-label={t('nav.settings')}
        >
          <SettingsIcon className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">{t('nav.settings')}</span>
        </NavLink>
      </div>
    </header>
  )
}

export default HeaderNav
