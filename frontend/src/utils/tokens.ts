export interface StoredSession {
  accessToken: string
  refreshToken: string
  user: unknown
  updatedAt: number
}

const ACCESS_TOKEN_KEY = 'subscriptions.auth.accessToken'
const REFRESH_TOKEN_KEY = 'subscriptions.auth.refreshToken'
const USER_KEY = 'subscriptions.auth.user'

export const readStoredSession = (): StoredSession | null => {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  const userRaw = localStorage.getItem(USER_KEY)
  if (!accessToken || !refreshToken || !userRaw) {
    return null
  }
  try {
    const user = JSON.parse(userRaw)
    return { accessToken, refreshToken, user, updatedAt: Date.now() }
  } catch (error) {
    console.warn('Failed to parse stored user', error)
    return null
  }
}

export const persistSession = (session: { accessToken: string; refreshToken: string; user: unknown }) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken)
  localStorage.setItem(USER_KEY, JSON.stringify(session.user))
}

export const clearSessionStorage = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const getStoredAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY)
export const getStoredRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY)
