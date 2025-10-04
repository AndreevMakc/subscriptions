import { apiRequest } from './client'

export interface LoginResponse {
  provider: string
  authorization_url: string
  state: string
  expires_at: string
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  refresh_expires_in: number
}

export interface CallbackResponse {
  user: {
    id: string
    email: string
    email_verified: boolean
    tz: string
    locale: string
    created_at: string
    updated_at: string
  }
  tokens: TokenPair | null
  pending_verification: boolean
}

export interface RefreshResponse {
  tokens: TokenPair
  user: CallbackResponse['user']
}

export const startLogin = async (redirectUri: string) => {
  return apiRequest<LoginResponse>(`/api/v1/auth/login?redirect_uri=${encodeURIComponent(redirectUri)}`)
}

export const exchangeCode = async (state: string, code: string) => {
  return apiRequest<CallbackResponse>(`/api/v1/auth/callback?state=${state}&code=${code}`)
}

export const refreshTokens = async (refresh_token: string) => {
  return apiRequest<RefreshResponse>('/api/v1/auth/refresh', {
    method: 'POST',
    body: { refresh_token },
  })
}
