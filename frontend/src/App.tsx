import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import LoadingState from './components/LoadingState'
import ThemeContainer from './components/ThemeContainer'
import ArchivePage from './pages/Archive'
import DashboardPage from './pages/Dashboard'
import SettingsPage from './pages/Settings'
import SubscriptionEditorPage from './pages/SubscriptionEditor'
import SubscriptionsPage from './pages/Subscriptions'
import { useStore } from './store/useStore'

const App = () => {
  const hasHydrated = useStore((state) => state.hasHydrated)
  const recomputeStatuses = useStore((state) => state.recomputeStatuses)

  useEffect(() => {
    if (hasHydrated) {
      recomputeStatuses()
    }
  }, [hasHydrated, recomputeStatuses])

  if (!hasHydrated) {
    return (
      <ThemeContainer>
        <LoadingState message="Loading your subscriptions" />
      </ThemeContainer>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="subscriptions/new" element={<SubscriptionEditorPage mode="create" />} />
        <Route path="subscriptions/:id/edit" element={<SubscriptionEditorPage mode="edit" />} />
        <Route path="archive" element={<ArchivePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
