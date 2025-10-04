import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { selectAuth, useStore } from '../store/useStore'

const LoginPage = () => {
  const navigate = useNavigate()
  const { user, isAuthenticating, pendingVerification } = useStore(selectAuth)
  const beginLogin = useStore((state) => state.beginLogin)

  useEffect(() => {
    if (user && !pendingVerification) {
      navigate('/', { replace: true })
    }
  }, [user, pendingVerification, navigate])

  return (
    <div className="glass-card mx-auto max-w-lg space-y-6 rounded-3xl p-8 text-center">
      <h1 className="text-2xl font-semibold text-midnight">Sign in</h1>
      <p className="text-sm text-midnight/70">
        Use your identity provider account to access subscription tracking and reminders.
      </p>
      {pendingVerification ? (
        <div className="rounded-2xl bg-white/70 p-4 text-sm text-midnight/80">
          Check your inbox and confirm the email address before signing in.
        </div>
      ) : null}
      <button
        type="button"
        className="pill-button bg-accent text-white shadow-card hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-accent/60"
        onClick={() => beginLogin()}
        disabled={isAuthenticating}
      >
        {isAuthenticating ? 'Redirecting…' : 'Continue with OAuth'}
      </button>
    </div>
  )
}

export default LoginPage
