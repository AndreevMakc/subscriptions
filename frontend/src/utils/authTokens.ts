const TOKEN_KEY = 'subskeeper.tokens'

export interface StoredTokenPair {
  access_token: string
  refresh_token: string
  token_type?: string
  expires_in?: number
  refresh_expires_in?: number
}

const safeGet = (key: string) => {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const safeSet = (key: string, value: string | null) => {
  if (typeof window === 'undefined') return
  try {
    if (value === null) {
      window.localStorage.removeItem(key)
    } else {
      window.localStorage.setItem(key, value)
    }
  } catch {
    // ignore storage errors (private mode, etc.)
  }
}

const readTokens = (): StoredTokenPair | null => {
  const raw = safeGet(TOKEN_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredTokenPair
  } catch {
    return null
  }
}

let tokens: StoredTokenPair | null = readTokens()

export const setAuthTokens = (next: StoredTokenPair | null) => {
  tokens = next
  safeSet(TOKEN_KEY, next ? JSON.stringify(next) : null)
}

export const getStoredTokens = () => tokens
export const getAccessToken = () => tokens?.access_token ?? null
export const getRefreshToken = () => tokens?.refresh_token ?? null
