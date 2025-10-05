import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import HeaderNav from './components/HeaderNav'
import Footer from './components/Footer'
import ThemeContainer from './components/ThemeContainer'
import ToastStack from './components/ToastStack'
import { useStore } from './store/useStore'
import { useAuthStore } from './store/useAuthStore'
import { useI18n } from './i18n'

const App = () => {
  const hydrated = useStore((state) => state.hydrated)
  const initialize = useStore((state) => state.initialize)
  const authHydrated = useAuthStore((state) => state.hydrated)
  const isAuthenticated = useAuthStore((state) => Boolean(state.user && state.accessToken))
  const emailVerificationPending = useAuthStore((state) => state.emailVerificationPending)
  const { t } = useI18n()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authHydrated) return
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }
    if (!hydrated) {
      void initialize()
    }
  }, [authHydrated, hydrated, initialize, isAuthenticated, navigate])

  const showContent = authHydrated && isAuthenticated && hydrated

  return (
    <ThemeContainer>
      <HeaderNav />
      <main className="flex-1">
        {emailVerificationPending ? (
          <div className="glass-card mb-6 rounded-3xl border border-amber-200 bg-amber-100/80 p-4 text-center text-sm text-amber-900 shadow-card">
            {t('auth.callback.pending')}
          </div>
        ) : null}
        {showContent ? (
          <Outlet />
        ) : (
          <div className="glass-card rounded-3xl p-8 text-center text-sm text-midnight/70">
            {t('app.loading')}
          </div>
        )}
      </main>
      <Footer />
      <ToastStack />
    </ThemeContainer>
  )
}

export default App
