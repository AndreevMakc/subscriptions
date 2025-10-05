import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useI18n } from '../i18n'

const AuthCallbackPage = () => {
  const [status, setStatus] = useState<'pending' | 'verifying' | 'success' | 'error'>('pending')
  const [message, setMessage] = useState<string>('')
  const [searchParams] = useSearchParams()
  const searchParamsString = searchParams.toString()
  const completeLogin = useAuthStore((state) => state.completeLogin)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()
  const { t } = useI18n()

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString)
    const errorParam = params.get('error')
    const code = params.get('code')
    const stateParam = params.get('state')

    if (errorParam) {
      setStatus('error')
      setMessage(errorParam)
      return
    }

    if (!code || !stateParam) {
      setStatus('error')
      setMessage(t('auth.callback.error'))
      return
    }

    const run = async () => {
      setStatus('verifying')
      try {
        const user = await completeLogin(code, stateParam)
        if (user.email_verified) {
          setStatus('success')
          setTimeout(() => navigate('/'), 800)
        } else {
          setStatus('pending')
          setMessage(t('auth.callback.pending'))
        }
      } catch (error) {
        console.error(error)
        setStatus('error')
        setMessage(t('auth.callback.error'))
      }
    }

    void run()
  }, [completeLogin, navigate, searchParamsString, t])

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return <p className="text-sm text-midnight/70">{t('auth.callback.verifying')}</p>
      case 'success':
        return <p className="text-sm text-midnight/70">{t('auth.callback.success')}</p>
      case 'pending':
        return <p className="text-sm text-midnight/70">{message}</p>
      case 'error':
        return (
          <>
            <p className="text-sm text-rose-500">{message}</p>
            <button
              type="button"
              className="pill-button mt-4 bg-white/70 px-4 py-2 text-sm font-semibold text-midnight shadow-card"
              onClick={() => logout()}
            >
              {t('auth.login.google')}
            </button>
          </>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-emerald-100 p-6">
      <div className="glass-card max-w-md rounded-3xl border border-white/60 bg-white/80 p-8 text-center shadow-card">
        <h1 className="mb-3 text-2xl font-semibold text-midnight">SubsKeeper</h1>
        {renderContent()}
        {status === 'pending' && (
          <p className="mt-6 text-xs text-midnight/60">{t('auth.verify.pending')}</p>
        )}
        {status === 'pending' && (
          <button
            type="button"
            className="pill-button mt-6 w-full bg-accent py-2 text-sm font-semibold text-white shadow-card hover:bg-accent/90"
            onClick={() => navigate('/')}
          >
            {t('auth.verify.cta')}
          </button>
        )}
      </div>
    </div>
  )
}

export default AuthCallbackPage
