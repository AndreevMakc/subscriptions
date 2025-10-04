import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App'
import DashboardPage from './pages/DashboardPage'
import SubscriptionsPage from './pages/SubscriptionsPage'
import SubscriptionNewPage from './pages/SubscriptionNewPage'
import SubscriptionEditPage from './pages/SubscriptionEditPage'
import ArchivePage from './pages/ArchivePage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<DashboardPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="subscriptions/new" element={<SubscriptionNewPage />} />
          <Route path="subscriptions/:id/edit" element={<SubscriptionEditPage />} />
          <Route path="archive" element={<ArchivePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="auth/callback" element={<AuthCallbackPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
