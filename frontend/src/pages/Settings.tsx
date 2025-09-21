import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import EmptyState from '../components/EmptyState'
import { useStore } from '../store/useStore'

const currencies = ['USD', 'EUR', 'GBP', 'RUB', 'UAH', 'KZT', 'BYN'] as const

const settingsSchema = z.object({
  locale: z.enum(['en', 'ru']),
  timezone: z.string().min(1, 'Timezone is required'),
  defaultCurrency: z.enum(currencies),
  reminderDaysBefore: z.coerce.number().min(1).max(60),
  email: z
    .string()
    .email('Enter a valid email')
    .optional()
    .or(z.literal('')),
  telegramLinked: z.boolean().optional(),
})

type SettingsFormValues = z.infer<typeof settingsSchema>
type SettingsFormInputs = z.input<typeof settingsSchema>

const SettingsPage = () => {
  const settings = useStore((state) => state.settings)
  const updateSettings = useStore((state) => state.updateSettings)

  const timezoneOptions = useMemo(() => {
    const defaults = [
      'UTC',
      'Europe/London',
      'Europe/Berlin',
      'Europe/Moscow',
      'Europe/Kyiv',
      'Asia/Almaty',
      'Asia/Yekaterinburg',
      'America/New_York',
      'America/Los_Angeles',
    ]
    const unique = new Set(defaults)
    unique.add(settings.timezone)
    try {
      const supported = (Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone')
      if (supported) {
        supported.slice(0, 40).forEach((zone) => unique.add(zone))
      }
    } catch {
      // ignore
    }
    return Array.from(unique).sort()
  }, [settings.timezone])

  const form = useForm<SettingsFormInputs, unknown, SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      locale: settings.locale,
      timezone: settings.timezone,
      defaultCurrency: settings.defaultCurrency,
      reminderDaysBefore: settings.reminderDaysBefore,
      email: settings.email ?? '',
      telegramLinked: settings.telegramLinked ?? false,
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = form

  const onSubmit = handleSubmit((values) => {
    updateSettings({
      locale: values.locale,
      timezone: values.timezone,
      defaultCurrency: values.defaultCurrency,
      reminderDaysBefore: values.reminderDaysBefore,
      email: values.email || undefined,
      telegramLinked: values.telegramLinked ?? false,
    })
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card rounded-4xl px-6 py-5 shadow-card-soft">
        <p className="section-label mb-2">Settings</p>
        <h1 className="text-2xl font-semibold text-midnight">Personalise SubsKeeper</h1>
        <p className="text-sm text-slate-600">
          Control how reminders behave, set your default currency, and keep contact details up to date.
        </p>
      </div>
      <form onSubmit={onSubmit} className="glass-card flex flex-col gap-6 rounded-4xl p-8 shadow-card-soft">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Language
            <select {...register('locale')} className="input-field">
              <option value="en">English</option>
              <option value="ru">Русский</option>
            </select>
            {errors.locale ? <span className="text-xs text-rose-600">{errors.locale.message}</span> : null}
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Default currency
            <select {...register('defaultCurrency')} className="input-field">
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
            {errors.defaultCurrency ? <span className="text-xs text-rose-600">{errors.defaultCurrency.message}</span> : null}
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Timezone
            <select {...register('timezone')} className="input-field">
              {timezoneOptions.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
            {errors.timezone ? <span className="text-xs text-rose-600">{errors.timezone.message}</span> : null}
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Reminder window (days)
            <input type="number" min={1} max={60} {...register('reminderDaysBefore')} className="input-field" />
            {errors.reminderDaysBefore ? (
              <span className="text-xs text-rose-600">{errors.reminderDaysBefore.message}</span>
            ) : null}
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Email
            <input type="email" placeholder="name@example.com" {...register('email')} className="input-field" />
            {errors.email ? <span className="text-xs text-rose-600">{errors.email.message}</span> : null}
          </label>
          <label className="flex flex-col gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Telegram (mock)
            <div className="flex items-center gap-3 rounded-3xl bg-white/60 p-4 shadow-inner-sm">
              <input type="checkbox" {...register('telegramLinked')} className="h-4 w-4 rounded border-white/60" />
              <span className="text-sm normal-case text-slate-600">
                {form.watch('telegramLinked') ? 'Linked' : 'Not linked'}
              </span>
            </div>
          </label>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" className="pill-button bg-white/70 text-midnight" onClick={() => form.reset()}>
            Reset changes
          </button>
          <button
            type="submit"
            className="pill-button bg-accent/80 text-white shadow-card hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isDirty || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save preferences'}
          </button>
        </div>
      </form>
      <EmptyState
        title="Need advanced automations?"
        description="SubsKeeper runs offline with local reminders today. Connect your Telegram or email to receive daily summaries (mock placeholders here)."
      />
    </div>
  )
}

export default SettingsPage
