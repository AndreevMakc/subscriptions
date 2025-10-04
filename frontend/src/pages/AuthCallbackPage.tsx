import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { selectAuth, useStore } from '../store/useStore'

const AuthCallbackPage = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const completeLogin = useStore((state) => state.completeLogin)
  const { user, tokens, pendingVerification, isAuthenticating } = useStore(selectAuth)

  useEffect(() => {
    const stateParam = params.get('state')
    const code = params.get('code')
    if (stateParam && code) {
      void completeLogin(stateParam, code)
    } else {
      navigate('/login', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (user && tokens && !pendingVerification) {
      navigate('/', { replace: true })
    }
  }, [user, tokens, pendingVerification, navigate])

  return (
    <div className="glass-card mx-auto max-w-lg space-y-4 rounded-3xl p-8 text-center">
      <h1 className="text-xl font-semibold text-midnight">Finishing sign in…</h1>
      <p className="text-sm text-midnight/70">
        {pendingVerification
          ? 'Almost there! Confirm the email link we just sent you.'
          : 'Communicating with the identity provider. Please wait.'}
      </p>
      {isAuthenticating ? (
        <p className="text-xs uppercase tracking-[0.2em] text-midnight/40">Processing…</p>
      ) : null}
      {pendingVerification && !isAuthenticating ? (
        <button
          type="button"
          className="pill-button bg-accent text-white shadow-card hover:bg-accent/90"
          onClick={() => navigate('/login', { replace: true })}
        >
          Back to login
        </button>
      ) : null}
    </div>
  )
}

export default AuthCallbackPage
