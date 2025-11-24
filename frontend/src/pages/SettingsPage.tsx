import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SUPPORTED_CURRENCIES } from '../utils/constants'
import { settingsSchema, type SettingsFormValues } from '../utils/validation'
import { selectSettings, useStore } from '../store/useStore'
import { useI18n } from '../i18n'
import TelegramLinkCard from '../components/TelegramLinkCard'

const SettingsPage = () => {
  const settings = useStore(selectSettings)
  const updateSettings = useStore((state) => state.updateSettings)
  const pushToast = useStore((state) => state.pushToast)
  const { t } = useI18n()

  const timezones = useMemo(() => {
    try {
      if (typeof Intl.supportedValuesOf === 'function') {
        return Intl.supportedValuesOf('timeZone') as string[]
      }
    } catch (error) {
      console.warn('Timezone listing unsupported', error)
    }
    return [settings.timezone]
  }, [settings.timezone])

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    reset,
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
    mode: 'onBlur',
  })

  useEffect(() => {
    reset(settings)
  }, [reset, settings])

  const onSubmit = handleSubmit((values) => {
    updateSettings(values)
    pushToast({
      title: t('settings.toast.saved.title'),
      description: t('settings.toast.saved.description'),
      variant: 'success',
    })
  })

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit} className="glass-card flex flex-col gap-6 rounded-3xl p-6 shadow-card">
        <p className="text-section accent-dot">{t('settings.title')}</p>
        <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">{t('settings.locale')}</span>
          <select
            {...register('locale')}
            className="rounded-full border border-white/60 bg-white/80 px-4 py-2 focus-ring"
          >
            <option value="en">{t('settings.localeOption.en')}</option>
            <option value="ru">{t('settings.localeOption.ru')}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">{t('settings.currency')}</span>
          <select
            {...register('defaultCurrency')}
            className="rounded-full border border-white/60 bg-white/80 px-4 py-2 focus-ring"
          >
            {SUPPORTED_CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">{t('settings.timezone')}</span>
          <input
            list="tz-list"
            {...register('timezone')}
            className="rounded-full border border-white/60 bg-white/80 px-4 py-2 focus-ring"
          />
          {errors.timezone ? <span className="text-xs text-rose-500">{errors.timezone.message}</span> : null}
        </label>
        <datalist id="tz-list">
          {timezones.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">{t('settings.reminderDays')}</span>
          <input
            type="number"
            min={0}
            max={60}
            {...register('reminderDaysBefore', { valueAsNumber: true })}
            className="rounded-full border border-white/60 bg-white/80 px-4 py-2 focus-ring"
          />
          {errors.reminderDaysBefore ? (
            <span className="text-xs text-rose-500">{errors.reminderDaysBefore.message}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">{t('settings.email')}</span>
          <input
            type="email"
            placeholder={t('settings.emailPlaceholder')}
            {...register('email')}
            className="rounded-full border border-white/60 bg-white/80 px-4 py-2 focus-ring"
          />
          {errors.email ? <span className="text-xs text-rose-500">{errors.email.message}</span> : null}
        </label>

        </div>

        <div className="flex justify-end gap-3">
          <button type="button" className="pill-button" onClick={() => reset(settings)}>
            {t('settings.revert')}
          </button>
          <button
            type="submit"
            className="pill-button bg-accent text-white shadow-card hover:bg-accent/90"
            disabled={!isDirty || isSubmitting}
          >
            {t('settings.save')}
          </button>
        </div>
      </form>

      <TelegramLinkCard />
    </div>
  )
}

export default SettingsPage
