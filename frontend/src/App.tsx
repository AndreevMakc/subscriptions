import { Outlet } from 'react-router-dom'
import HeaderNav from './components/HeaderNav'
import Footer from './components/Footer'
import ThemeContainer from './components/ThemeContainer'
import ToastStack from './components/ToastStack'
import { useStore } from './store/useStore'
import { useI18n } from './i18n'

const App = () => {
  const hydrated = useStore((state) => state.hydrated)
  const { t } = useI18n()

  return (
    <ThemeContainer>
      <HeaderNav />
      <main className="flex-1">
        {hydrated ? (
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
