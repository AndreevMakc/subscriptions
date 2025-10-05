import { useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import {
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  Bars3Icon,
  Cog6ToothIcon,
  HomeIcon,
  PlusIcon,
  Squares2X2Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { ZodError } from 'zod'
import { persistedStateSchema } from '../utils/validation'
import { selectSettings, selectSubscriptions, useStore } from '../store/useStore'
import type { PersistedState } from '../types'
import { useI18n, type TranslationKey } from '../i18n'
import { useAuthStore } from '../store/useAuthStore'

const navItems: { to: string; key: TranslationKey; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { to: '/', key: 'nav.dashboard', Icon: HomeIcon },
  { to: '/subscriptions', key: 'nav.subscriptions', Icon: Squares2X2Icon },
  { to: '/archive', key: 'nav.archive', Icon: ArchiveBoxIcon },
]

const HeaderNav = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const subscriptions = useStore(selectSubscriptions)
  const settings = useStore(selectSettings)
  const importData = useStore((state) => state.importData)
  const recomputeStatuses = useStore((state) => state.recomputeStatuses)
  const pushToast = useStore((state) => state.pushToast)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const location = useLocation()
  const { t, locale } = useI18n()
  const isRussian = locale === 'ru'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const desktopTextClass = isRussian
    ? 'text-sm leading-tight xl:text-base'
    : 'text-[13px] leading-tight xl:text-sm 2xl:text-base'
  const desktopPaddingClass = isRussian ? 'px-3 py-2' : 'px-3.5 py-2'

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileMenuOpen])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname, location.search])

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
    setMobileMenuOpen(false)
    fileInputRef.current?.click()
  }

  const handleImport: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      if (!text.trim()) {
        throw new Error('SUBSKEEPER_EMPTY_FILE')
      }
      const parsed = JSON.parse(text)
      const data = persistedStateSchema.parse(parsed) as PersistedState
      await importData(data)
      await recomputeStatuses()
      pushToast({
        title: t('nav.importComplete.title'),
        description: t('nav.importComplete.description'),
        variant: 'success',
      })
    } catch (error) {
      console.error(error)
      let description = t('nav.importFailed.description')
      if (error instanceof SyntaxError) {
        description = t('nav.importFailed.invalidJson')
      } else if (error instanceof ZodError) {
        description = t('nav.importFailed.invalidStructure')
      } else if (error instanceof Error && error.message === 'SUBSKEEPER_EMPTY_FILE') {
        description = t('nav.importFailed.empty')
      }
      pushToast({
        title: t('nav.importFailed.title'),
        description,
        variant: 'error',
      })
    } finally {
      event.target.value = ''
    }
  }

  const addSubscriptionLabel = t('nav.addSubscription')
  const addSubscriptionText = isRussian ? 'Добавить' : addSubscriptionLabel

  const desktopNavLinkClasses = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'pill-button flex items-center gap-2 font-medium transition',
      desktopTextClass,
      'whitespace-nowrap text-center',
      desktopPaddingClass,
      isActive ? 'bg-white/80 text-midnight shadow-card' : 'bg-white/40 text-midnight/80 hover:text-midnight',
    )

  return (
    <header className="glass-card mb-8 flex flex-col gap-4 rounded-card border border-white/60 bg-white/70 p-6 shadow-card backdrop-blur-xl md:gap-6">
      <div className="flex items-center justify-between gap-4">
        <NavLink to="/" className="flex items-center gap-3 text-lg font-semibold tracking-wide">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-midnight shadow-inner-soft">
            SK
          </span>
          <span>
            <span className="block text-sm uppercase tracking-[0.4em] text-midnight/60">SubsKeeper</span>
            <span className="block text-base font-semibold leading-tight text-midnight">{t('nav.tagline')}</span>
          </span>
        </NavLink>
        <div className="flex items-center gap-2 lg:hidden">
          <NavLink
            to={{ pathname: '/subscriptions/new', search: location.search }}
            className="pill-button flex h-10 w-10 items-center justify-center bg-accent text-white shadow-card hover:bg-accent/90"
            aria-label={addSubscriptionLabel}
          >
            <PlusIcon aria-hidden="true" className="h-5 w-5" />
          </NavLink>
          <button
            type="button"
            className="pill-button flex h-10 w-10 items-center justify-center bg-white/70 text-midnight shadow-inner-soft"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          >
            {mobileMenuOpen ? <XMarkIcon aria-hidden="true" className="h-6 w-6" /> : <Bars3Icon aria-hidden="true" className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div className="hidden w-full items-center justify-end gap-3 lg:flex lg:gap-4">
        <nav className="flex flex-nowrap items-center gap-2.5">
          {navItems.map(({ to, key, Icon }) => (
            <NavLink key={to} to={to} className={desktopNavLinkClasses} end={to === '/'}>
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap">{t(key)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-nowrap items-center gap-2.5">
          <button
            type="button"
            className={clsx(
              'pill-button flex items-center gap-2 font-medium transition',
              desktopTextClass,
              desktopPaddingClass,
              'bg-white/40 text-midnight/80 hover:text-midnight',
            )}
            onClick={handleImportClick}
            aria-label={t('import.ariaLabel')}
          >
            <ArrowUpTrayIcon aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap">{t('nav.importJson')}</span>
          </button>
          <button
            type="button"
            className={clsx(
              'pill-button flex items-center gap-2 font-medium transition',
              desktopTextClass,
              desktopPaddingClass,
              'bg-white/40 text-midnight/80 hover:text-midnight',
            )}
            onClick={handleExport}
          >
            <ArrowDownTrayIcon aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap">{t('nav.export')}</span>
          </button>
          <NavLink
            to={{ pathname: '/subscriptions/new', search: location.search }}
            className={clsx(
              'pill-button flex items-center gap-2 bg-accent font-medium text-white shadow-card transition hover:bg-accent/90',
              desktopTextClass,
              desktopPaddingClass,
            )}
            aria-label={addSubscriptionLabel}
          >
            <PlusIcon aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span aria-hidden={isRussian} className="whitespace-nowrap">
              {addSubscriptionText}
            </span>
            {isRussian && <span className="sr-only">{addSubscriptionLabel}</span>}
          </NavLink>
        </div>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(
              'pill-button flex items-center gap-2 font-medium text-white shadow-card transition',
              desktopTextClass,
              desktopPaddingClass,
              isActive ? 'bg-accent/90' : 'bg-accent hover:bg-accent/90',
            )
          }
        >
          <Cog6ToothIcon aria-hidden="true" className="h-5 w-5 shrink-0" />
          <span className="whitespace-nowrap">{t('nav.settings')}</span>
        </NavLink>
        {user ? (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-midnight/70">
              {user.email}
            </span>
            <button
              type="button"
              className={clsx(
                'pill-button flex items-center gap-2 font-medium transition',
                desktopTextClass,
                desktopPaddingClass,
                'bg-white/40 text-midnight/80 hover:text-midnight',
              )}
              onClick={logout}
            >
              {t('nav.logout')}
            </button>
          </div>
        ) : null}
      </div>

      {mobileMenuOpen && isClient
        ? createPortal(
            <div
              className="fixed inset-0 z-[400] flex justify-end bg-midnight/30 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div
                id="mobile-navigation"
                role="dialog"
                aria-modal="true"
                aria-label={t('nav.menuTitle')}
                className="glass-card m-4 flex w-full max-w-xs flex-col gap-6 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-card"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase tracking-[0.3em] text-midnight/60">SubsKeeper</span>
                  <button
                    type="button"
                    className="pill-button flex h-10 w-10 items-center justify-center bg-white/70 text-midnight hover:bg-white"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label={t('nav.closeMenu')}
                  >
                    <XMarkIcon aria-hidden="true" className="h-5 w-5" />
                  </button>
                </div>
                {user ? (
                  <div className="rounded-2xl bg-white/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-midnight/70">
                    {user.email}
                  </div>
                ) : null}
                <nav className="flex flex-col gap-1.5">
                  {navItems.map(({ to, key, Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        clsx(
                          'pill-button flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] leading-5 font-medium',
                          isActive ? 'bg-white/80 text-midnight shadow-card' : 'bg-white/50 text-midnight/80 hover:text-midnight',
                        )
                      }
                      end={to === '/'}
                    >
                      <Icon aria-hidden="true" className="h-4 w-4" />
                      <span className="text-left leading-snug">{t(key)}</span>
                    </NavLink>
                  ))}
                </nav>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    className="pill-button flex items-center gap-2.5 bg-white/60 px-3.5 py-2.5 text-[13px] leading-5 font-medium text-midnight/80 hover:text-midnight"
                    onClick={handleImportClick}
                    aria-label={t('import.ariaLabel')}
                  >
                    <ArrowUpTrayIcon aria-hidden="true" className="h-4 w-4" />
                    <span className="text-left leading-snug">{t('nav.importJson')}</span>
                  </button>
                  <button
                    type="button"
                    className="pill-button flex items-center gap-2.5 bg-white/60 px-3.5 py-2.5 text-[13px] leading-5 font-medium text-midnight/80 hover:text-midnight"
                    onClick={handleExport}
                  >
                    <ArrowDownTrayIcon aria-hidden="true" className="h-4 w-4" />
                    <span className="text-left leading-snug">{t('nav.export')}</span>
                  </button>
                  <NavLink
                    to={{ pathname: '/subscriptions/new', search: location.search }}
                    className="pill-button flex items-center gap-2.5 bg-accent px-3.5 py-2.5 text-[13px] font-semibold text-white shadow-card hover:bg-accent/90"
                    aria-label={addSubscriptionLabel}
                  >
                    <PlusIcon aria-hidden="true" className="h-4 w-4" />
                    <span>{addSubscriptionLabel}</span>
                  </NavLink>
                </div>
                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    clsx(
                      'pill-button flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-semibold text-white shadow-card transition',
                      isActive ? 'bg-accent/90' : 'bg-accent hover:bg-accent/90',
                    )
                  }
                >
                  <Cog6ToothIcon aria-hidden="true" className="h-4 w-4" />
                  <span className="text-left leading-snug">{t('nav.settings')}</span>
                </NavLink>
                {user ? (
                  <button
                    type="button"
                    className="pill-button flex items-center gap-2.5 bg-white/60 px-3.5 py-2.5 text-[13px] font-medium text-midnight/80 hover:text-midnight"
                    onClick={logout}
                  >
                    {t('nav.logout')}
                  </button>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="sr-only"
        onChange={handleImport}
        aria-label={t('import.ariaLabel')}
      />
    </header>
  )
}

export default HeaderNav
