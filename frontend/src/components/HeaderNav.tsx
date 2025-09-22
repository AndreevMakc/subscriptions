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
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M19.14 12.936c.036-.303.06-.607.06-.936 0-.33-.024-.633-.07-.936l2.03-1.58a.5.5 0 00.11-.642l-1.924-3.33a.5.5 0 00-.607-.22l-2.39.96a7.032 7.032 0 00-1.62-.936l-.36-2.54a.5.5 0 00-.495-.42h-3.848a.5.5 0 00-.495.42l-.36 2.54a7.02 7.02 0 00-1.62.936l-2.39-.96a.5.5 0 00-.607.22L2.72 8.944a.5.5 0 00.11.642l2.03 1.58c-.046.303-.07.606-.07.936 0 .33.024.633.07.936l-2.03 1.58a.5.5 0 00-.11.642l1.924 3.33a.5.5 0 00.607.22l2.39-.96c.5.39 1.05.71 1.62.936l.36 2.54a.5.5 0 00.495.42h3.848a.5.5 0 00.495-.42l.36-2.54a7.032 7.032 0 001.62-.936l2.39.96a.5.5 0 00.607-.22l1.924-3.33a.5.5 0 00-.11-.642z" />
    <path d="M12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" />
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
  const { t, locale } = useI18n()
  const isRussian = locale === 'ru'

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

  const addSubscriptionLabel = t('nav.addSubscription')
  const addSubscriptionText = isRussian ? 'Добавить' : addSubscriptionLabel

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

      <div
        className={clsx(
          'flex w-full min-w-0 flex-nowrap items-center overflow-x-auto sm:w-auto sm:justify-end',
          isRussian ? 'gap-2 sm:gap-3' : 'gap-3',
        )}
      >
        <nav className={clsx('flex flex-nowrap items-center flex-shrink-0', isRussian ? 'gap-2' : 'gap-3')}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'pill-button whitespace-nowrap font-medium transition flex-shrink-0',
                  isRussian ? 'px-3 py-2' : 'px-4 py-2',
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

        <div
          className={clsx(
            'flex flex-nowrap items-center flex-shrink-0',
            isRussian ? 'gap-2' : 'gap-3',
          )}
        >
          <button
            type="button"
            className={clsx(
              'pill-button whitespace-nowrap flex-shrink-0',
              isRussian ? 'px-3 py-2' : 'px-4 py-2',
            )}
            onClick={handleImportClick}
          >
            {t('nav.importJson')}
          </button>
          <button
            type="button"
            className={clsx(
              'pill-button whitespace-nowrap flex-shrink-0',
              isRussian ? 'px-3 py-2' : 'px-4 py-2',
            )}
            onClick={handleExport}
          >
            {t('nav.export')}
          </button>
          <NavLink
            to={{ pathname: '/subscriptions/new', search: location.search }}
            className={clsx(
              'pill-button whitespace-nowrap bg-accent text-white shadow-card hover:bg-accent/90 flex-shrink-0',
              isRussian ? 'px-3 py-2' : 'px-4 py-2',
            )}
            aria-label={addSubscriptionLabel}
          >
            <span aria-hidden={isRussian}>{addSubscriptionText}</span>
            {isRussian && <span className="sr-only">{addSubscriptionLabel}</span>}
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
              'pill-button p-2 text-midnight transition flex-shrink-0',
              isActive
                ? 'bg-white/80 shadow-card text-midnight'
                : 'bg-white/40 text-midnight/80 hover:text-midnight',
            )
          }
          aria-label={t('nav.settings')}
        >
          <SettingsIcon className="h-5 w-5" />
          <span className="sr-only">{t('nav.settings')}</span>
        </NavLink>
      </div>
    </header>
  )
}

export default HeaderNav
