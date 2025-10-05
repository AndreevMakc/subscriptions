import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useI18n } from '../i18n'

const LoginPage = () => {
  const login = useAuthStore((state) => state.login)
  const isAuthenticated = useAuthStore((state) => Boolean(state.user && state.accessToken))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { t } = useI18n()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const handleGoogleLogin = async () => {
    setError(null)
    setLoading(true)
    try {
      await login('google')
    } catch (err) {
      console.error(err)
      setError(t('auth.login.error'))
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-100 via-white to-emerald-100 p-6">
      <div className="glass-card max-w-md rounded-3xl border border-white/60 bg-white/80 p-8 text-center shadow-card">
        <h1 className="mb-2 text-2xl font-semibold text-midnight">{t('auth.login.title')}</h1>
        <p className="mb-6 text-sm text-midnight/70">{t('auth.login.description')}</p>
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="pill-button mx-auto flex w-full items-center justify-center gap-3 bg-white/70 py-3 text-midnight shadow-card transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <span className="animate-pulse text-sm uppercase tracking-[0.3em] text-midnight/60">
              {t('auth.callback.verifying')}
            </span>
          ) : (
            <span className="font-semibold">{t('auth.login.google')}</span>
          )}
        </button>
        {error ? <p className="mt-4 text-sm text-rose-500">{error}</p> : null}
      </div>
    </div>
  )
}

export default LoginPage
