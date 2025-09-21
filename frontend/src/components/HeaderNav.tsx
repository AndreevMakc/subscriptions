import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { useStore } from '../store/useStore'

const navLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/subscriptions', label: 'Subscriptions' },
  { to: '/archive', label: 'Archive' },
  { to: '/settings', label: 'Settings' },
]

const HeaderNav = () => {
  const exportData = useStore((state) => state.exportData)
  const importData = useStore((state) => state.importData)
  const resetDemoData = useStore((state) => state.resetDemoData)
  const pushToast = useStore((state) => state.pushToast)
  const setConfirm = useStore((state) => state.setConfirm)

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const handleExport = () => {
    const data = exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `subskeeper-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    pushToast({ title: 'Exported data', tone: 'success' })
    setMenuOpen(false)
  }

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        importData(parsed)
      } catch {
        pushToast({ title: 'Import failed', description: 'Could not parse file', tone: 'error' })
      }
    }
    reader.readAsText(file)
    event.target.value = ''
    setMenuOpen(false)
  }

  const handleReset = () => {
    setConfirm({
      title: 'Restore demo data?',
      description: 'This will replace your current subscriptions and settings with the original demo set.',
      confirmLabel: 'Restore',
      onConfirm: () => resetDemoData(),
    })
    setMenuOpen(false)
  }

  return (
    <header className="mx-auto w-full max-w-6xl pt-6">
      <div className="glass-card flex flex-wrap items-center justify-between gap-4 rounded-[2.75rem] px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-white/70 shadow-inner-sm shadow-card-soft">
            <span className="text-lg font-semibold text-midnight">S</span>
          </div>
          <div>
            <p className="section-label">SubsKeeper</p>
            <p className="text-sm text-slate-600">Track, forecast, and never miss a renewal.</p>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                clsx(
                  'rounded-full px-4 py-2 uppercase tracking-[0.18em] transition-all duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/40',
                  isActive
                    ? 'bg-white/80 text-midnight shadow-card-soft'
                    : 'text-slate-600 hover:bg-white/50 hover:text-midnight',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/subscriptions/new"
            className="pill-button bg-accent/80 text-white shadow-card hover:bg-accent"
            aria-label="Add subscription"
          >
            + New
          </Link>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="pill-button flex items-center gap-2 bg-white/70 text-sm text-midnight shadow-inner-sm hover:bg-white"
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <span className="h-2 w-2 rounded-full bg-accent/60" aria-hidden />
              Actions
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-3xl border border-white/70 bg-white/90 p-2 shadow-card-soft backdrop-blur-xl">
                <button
                  type="button"
                  className="w-full rounded-2xl px-4 py-2 text-left text-sm text-midnight transition hover:bg-peach/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/40"
                  onClick={handleExport}
                >
                  Export data (.json)
                </button>
                <button
                  type="button"
                  className="w-full rounded-2xl px-4 py-2 text-left text-sm text-midnight transition hover:bg-peach/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/40"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Import from file
                </button>
                <button
                  type="button"
                  className="w-full rounded-2xl px-4 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-100/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/40"
                  onClick={handleReset}
                >
                  Restore demo data
                </button>
              </div>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={handleImport}
          />
        </div>
      </div>
    </header>
  )
}

export default HeaderNav
