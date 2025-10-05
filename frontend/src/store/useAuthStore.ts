import { create } from 'zustand'
import { persistSession, readStoredSession, clearSessionStorage } from '../utils/tokens'
import type { User } from '../types'
import { completeOAuth, login as apiLogin, refreshTokens } from '../api/auth'

interface AuthState {
  hydrated: boolean
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  emailVerificationPending: boolean
  login: (provider?: string) => Promise<void>
  completeLogin: (code: string, state: string) => Promise<User>
  logout: () => void
  markEmailVerified: () => void
  refreshSession: () => Promise<void>
}

const createDefaultState = (): Omit<AuthState, 'login' | 'completeLogin' | 'logout' | 'markEmailVerified' | 'refreshSession'> => ({
  hydrated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  emailVerificationPending: false,
})

export const useAuthStore = create<AuthState>((set, get) => ({
  ...createDefaultState(),
  login: async (provider = 'google') => {
    const redirectUri = `${window.location.origin}/auth/callback`
    const response = await apiLogin(redirectUri, provider)
    sessionStorage.setItem('oauth.state', response.state)
    sessionStorage.setItem('oauth.provider', provider)
    window.location.assign(response.authorization_url)
  },
  completeLogin: async (code, state) => {
    const expectedState = sessionStorage.getItem('oauth.state')
    if (!expectedState || expectedState !== state) {
      throw new Error('Invalid OAuth state')
    }
    const { tokens, user } = await completeOAuth(code, state)
    sessionStorage.removeItem('oauth.state')
    sessionStorage.removeItem('oauth.provider')
    persistSession({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token, user })
    set({
      user,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      hydrated: true,
      emailVerificationPending: !user.email_verified,
    })
    return user
  },
  logout: () => {
    clearSessionStorage()
    set({ ...createDefaultState(), hydrated: true })
    window.location.assign('/login')
  },
  markEmailVerified: () => {
    const currentUser = get().user
    if (!currentUser) return
    const updatedUser: User = { ...currentUser, email_verified: true }
    const accessToken = get().accessToken
    const refreshToken = get().refreshToken
    if (accessToken && refreshToken) {
      persistSession({ accessToken, refreshToken, user: updatedUser })
    }
    set({ user: updatedUser, emailVerificationPending: false })
  },
  refreshSession: async () => {
    const { refreshToken } = get()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }
    const response = await refreshTokens(refreshToken)
    persistSession({
      accessToken: response.tokens.access_token,
      refreshToken: response.tokens.refresh_token,
      user: response.user,
    })
    set({
      user: response.user,
      accessToken: response.tokens.access_token,
      refreshToken: response.tokens.refresh_token,
      emailVerificationPending: !response.user.email_verified,
    })
  },
}))

const stored = readStoredSession()
if (stored) {
  const { accessToken, refreshToken, user } = stored
  useAuthStore.setState({
    hydrated: true,
    user: user as User,
    accessToken,
    refreshToken,
    emailVerificationPending: !(user as User).email_verified,
  })
} else {
  useAuthStore.setState({ hydrated: true })
}

export const requiresEmailVerification = () => {
  const state = useAuthStore.getState()
  return Boolean(state.emailVerificationPending)
}

export const getAccessToken = () => useAuthStore.getState().accessToken
