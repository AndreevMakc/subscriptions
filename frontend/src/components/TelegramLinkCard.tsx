import { useCallback, useEffect, useMemo, useState } from 'react'
import { getTelegramLinkStatus, requestTelegramLinkToken, type TelegramLinkStatus, type TelegramLinkToken } from '../api/telegram'
import { useStore } from '../store/useStore'
import { useI18n } from '../i18n'

const TOKEN_POLL_INTERVAL_MS = 5000

const TelegramLinkCard = () => {
  const [status, setStatus] = useState<TelegramLinkStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [token, setToken] = useState<TelegramLinkToken | null>(null)
  const [tokenLoading, setTokenLoading] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const pushToast = useStore((state) => state.pushToast)
  const { t, formatDate, formatRelativeToNow } = useI18n()

  const refreshStatus = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setStatusLoading(true)
      }
      try {
        const nextStatus = await getTelegramLinkStatus()
        setStatus(nextStatus)
        if (nextStatus.isLinked) {
          setToken(null)
        }
      } catch (error) {
        console.error('Failed to load Telegram link status', error)
        if (!options?.silent) {
          pushToast({
            title: t('settings.telegram.toast.statusError.title'),
            description: t('settings.telegram.toast.statusError.description'),
            variant: 'error',
          })
        }
      } finally {
        if (!options?.silent) {
          setStatusLoading(false)
        }
      }
    },
    [pushToast, t],
  )

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  const handleRequestToken = useCallback(async () => {
    setTokenLoading(true)
    try {
      const nextToken = await requestTelegramLinkToken()
      setToken(nextToken)
      setNow(Date.now())
      pushToast({
        title: t('settings.telegram.toast.generated.title'),
        description: t('settings.telegram.toast.generated.description'),
        variant: 'success',
      })
    } catch (error) {
      console.error('Failed to generate Telegram link token', error)
      pushToast({
        title: t('settings.telegram.toast.error.title'),
        description: t('settings.telegram.toast.error.description'),
        variant: 'error',
      })
    } finally {
      setTokenLoading(false)
    }
  }, [pushToast, t])

  useEffect(() => {
    if (!token || status?.isLinked) return
    const interval = window.setInterval(() => {
      void refreshStatus({ silent: true })
    }, TOKEN_POLL_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [refreshStatus, status?.isLinked, token])

  useEffect(() => {
    if (!token) return
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(tick)
  }, [token])

  const expiresAt = token ? new Date(token.expiresAt) : null
  const isTokenExpired = expiresAt ? expiresAt.getTime() <= now : false
  const expiresRelative = expiresAt ? formatRelativeToNow(token?.expiresAt ?? undefined) : ''

  const copyValue = useCallback(
    async (value: string, type: 'link' | 'token') => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(value)
        } else {
          const textarea = document.createElement('textarea')
          textarea.value = value
          textarea.style.position = 'fixed'
          textarea.style.opacity = '0'
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
        }
        pushToast({
          title:
            type === 'link'
              ? t('settings.telegram.toast.linkCopied.title')
              : t('settings.telegram.toast.tokenCopied.title'),
          variant: 'success',
        })
      } catch (error) {
        console.error('Failed to copy value', error)
        pushToast({
          title: t('settings.telegram.toast.copyError.title'),
          description: t('settings.telegram.toast.copyError.description'),
          variant: 'error',
        })
      }
    },
    [pushToast, t],
  )

  useEffect(() => {
    if (status?.isLinked) {
      setToken(null)
    }
  }, [status?.isLinked])

  const statusLabel = useMemo(() => {
    if (statusLoading) return t('settings.telegram.status.loading')
    if (status?.isLinked) return t('settings.telegram.status.connected')
    return t('settings.telegram.status.disconnected')
  }, [status?.isLinked, statusLoading, t])

  const linkedAtLabel =
    status?.isLinked && status.linkedAt
      ? t('settings.telegram.status.linkedAt', { date: formatDate(status.linkedAt) })
      : null

  const chatIdLabel =
    status?.isLinked && status.telegramChatId
      ? t('settings.telegram.status.chatId', { chatId: status.telegramChatId })
      : null

  return (
    <section className="glass-card flex flex-col gap-6 rounded-3xl p-6 shadow-card">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-section accent-dot">{t('settings.telegram.sectionTitle')}</p>
          <p className="text-lg font-semibold text-midnight">{t('settings.telegram.sectionDescription')}</p>
          <p className="text-sm text-midnight/70">{t('settings.telegram.sectionSubtitle')}</p>
          {status?.botUsername ? (
            <p className="text-xs uppercase tracking-[0.2em] text-midnight/50">
              {t('settings.telegram.botHandle', { handle: `@${status.botUsername}` })}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-3 text-right">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              status?.isLinked
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {statusLabel}
          </span>
          {linkedAtLabel ? <span className="text-xs text-midnight/60">{linkedAtLabel}</span> : null}
          {chatIdLabel ? <span className="text-xs text-midnight/60">{chatIdLabel}</span> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="pill-button"
              onClick={() => void refreshStatus()}
              disabled={statusLoading}
            >
              {statusLoading ? t('settings.telegram.actions.refreshing') : t('settings.telegram.actions.refreshStatus')}
            </button>
            <button
              type="button"
              className="pill-button bg-accent text-white shadow-card hover:bg-accent/90"
              onClick={() => void handleRequestToken()}
              disabled={tokenLoading}
            >
              {tokenLoading
                ? t('settings.telegram.actions.generating')
                : status?.isLinked
                  ? t('settings.telegram.actions.regenerate')
                  : t('settings.telegram.actions.generate')}
            </button>
          </div>
        </div>
      </div>

      {status?.botUsername ? null : (
        <div className="rounded-2xl border border-white/60 bg-white/50 p-4 text-sm text-amber-800">
          {t('settings.telegram.botUnavailable')}
        </div>
      )}

      {token ? (
        <div className="space-y-4 rounded-2xl border border-white/60 bg-white/60 p-4">
          <p className="text-sm font-medium text-midnight">{t('settings.telegram.tokenPending')}</p>
          <div className="space-y-2 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">
                {t('settings.telegram.tokenLabel')}
              </span>
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/70 bg-white/70 px-3 py-2">
                <span className="truncate font-mono text-xs text-midnight" title={token.deepLink}>
                  {token.deepLink}
                </span>
                <button
                  type="button"
                  className="pill-button text-xs"
                  onClick={() => void copyValue(token.deepLink, 'link')}
                >
                  {t('settings.telegram.actions.copyLink')}
                </button>
              </div>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">
                {t('settings.telegram.codeLabel')}
              </span>
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/70 bg-white/70 px-3 py-2">
                <span className="font-mono text-base">{token.token}</span>
                <button
                  type="button"
                  className="pill-button text-xs"
                  onClick={() => void copyValue(token.token, 'token')}
                >
                  {t('settings.telegram.actions.copyToken')}
                </button>
              </div>
            </label>

            {expiresAt ? (
              <p className={`text-xs ${isTokenExpired ? 'text-rose-500' : 'text-midnight/70'}`}>
                {isTokenExpired
                  ? t('settings.telegram.linkExpired')
                  : t('settings.telegram.linkExpires', { relative: expiresRelative })}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={token.deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="pill-button bg-midnight text-white hover:bg-midnight/80"
            >
              {t('settings.telegram.actions.openBot')}
            </a>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/60 bg-white/40 p-4 text-sm text-midnight/70">
          {t('settings.telegram.emptyState')}
        </div>
      )}

      <div className="rounded-2xl border border-white/60 bg-white/40 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-midnight/50">
          {t('settings.telegram.instructionsTitle')}
        </p>
        <ol className="mt-3 space-y-2 text-sm text-midnight/80">
          <li>{t('settings.telegram.instructions.step1')}</li>
          <li>{t('settings.telegram.instructions.step2')}</li>
          <li>{t('settings.telegram.instructions.step3')}</li>
        </ol>
      </div>
    </section>
  )
}

export default TelegramLinkCard
