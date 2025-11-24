import { apiRequest } from './client'

interface ApiTelegramLinkTokenResponse {
  token: string
  expires_at: string
  deep_link: string
}

interface ApiTelegramLinkStatusResponse {
  is_linked: boolean
  linked_at: string | null
  telegram_chat_id: number | null
  bot_username: string | null
}

export interface TelegramLinkToken {
  token: string
  expiresAt: string
  deepLink: string
}

export interface TelegramLinkStatus {
  isLinked: boolean
  linkedAt?: string | null
  telegramChatId?: number | null
  botUsername?: string | null
}

export const requestTelegramLinkToken = async (): Promise<TelegramLinkToken> => {
  const response = await apiRequest<ApiTelegramLinkTokenResponse>('/api/v1/telegram/link-token', {
    method: 'POST',
  })
  return {
    token: response.token,
    expiresAt: response.expires_at,
    deepLink: response.deep_link,
  }
}

export const getTelegramLinkStatus = async (): Promise<TelegramLinkStatus> => {
  const response = await apiRequest<ApiTelegramLinkStatusResponse>('/api/v1/telegram/status')
  return {
    isLinked: response.is_linked,
    linkedAt: response.linked_at,
    telegramChatId: response.telegram_chat_id,
    botUsername: response.bot_username ?? undefined,
  }
}
