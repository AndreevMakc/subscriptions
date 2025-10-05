import { apiRequest } from './client'
import type { User } from '../types'

interface AuthLoginResponse {
  provider: string
  authorization_url: string
  state: string
  expires_at: string
}

interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  refresh_expires_in: number
}

interface AuthCallbackResponse {
  user: User
  tokens: TokenPair
}

interface RefreshResponse {
  tokens: TokenPair
  user: User
}

interface EmailVerificationResponse {
  user: User
  detail: string
}

export const login = async (redirectUri: string, provider = 'google'): Promise<AuthLoginResponse> => {
  const params = new URLSearchParams({ redirect_uri: redirectUri, provider })
  return apiRequest<AuthLoginResponse>(`/api/v1/auth/login?${params.toString()}`)
}

export const completeOAuth = async (code: string, state: string): Promise<AuthCallbackResponse> => {
  const params = new URLSearchParams({ code, state })
  return apiRequest<AuthCallbackResponse>(`/api/v1/auth/callback?${params.toString()}`)
}

export const refreshTokens = async (refreshToken: string): Promise<RefreshResponse> => {
  return apiRequest<RefreshResponse>(`/api/v1/auth/refresh`, {
    method: 'POST',
    body: { refresh_token: refreshToken },
  })
}

export const verifyEmail = async (token: string): Promise<EmailVerificationResponse> => {
  return apiRequest<EmailVerificationResponse>(`/api/v1/auth/verify-email`, {
    method: 'POST',
    body: { token },
  })
}
