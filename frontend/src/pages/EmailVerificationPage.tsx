import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { verifyEmail } from '../api/auth'
import { useAuthStore } from '../store/useAuthStore'
import { useI18n } from '../i18n'

const EmailVerificationPage = () => {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [searchParams] = useSearchParams()
  const searchParamsString = searchParams.toString()
  const navigate = useNavigate()
  const markEmailVerified = useAuthStore((state) => state.markEmailVerified)
  const { t } = useI18n()

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString)
    const token = params.get('token')
    if (!token) {
      setStatus('error')
      return
    }

    const run = async () => {
      try {
        await verifyEmail(token)
        markEmailVerified()
        setStatus('success')
      } catch (error) {
        console.error(error)
        setStatus('error')
      }
    }

    void run()
  }, [markEmailVerified, searchParamsString])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-100 via-white to-sky-100 p-6">
      <div className="glass-card max-w-md rounded-3xl border border-white/60 bg-white/80 p-8 text-center shadow-card">
        <h1 className="mb-3 text-2xl font-semibold text-midnight">{t('auth.verify.title')}</h1>
        {status === 'idle' ? (
          <p className="text-sm text-midnight/70">{t('auth.callback.verifying')}</p>
        ) : null}
        {status === 'success' ? (
          <p className="text-sm text-midnight/70">{t('auth.verify.success')}</p>
        ) : null}
        {status === 'error' ? (
          <p className="text-sm text-rose-500">{t('auth.verify.error')}</p>
        ) : null}
        <button
          type="button"
          className="pill-button mt-6 w-full bg-accent py-2 text-sm font-semibold text-white shadow-card hover:bg-accent/90"
          onClick={() => navigate('/')}
        >
          {t('auth.verify.cta')}
        </button>
      </div>
    </div>
  )
}

export default EmailVerificationPage
