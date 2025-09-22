import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Settings, Subscription } from '../types'
import { SUPPORTED_CURRENCIES } from '../utils/constants'
import { subscriptionFormSchema, type SubscriptionFormValues } from '../utils/validation'
import { fromDateInputValue, toDateInputValue } from '../utils/dates'
import type { SubscriptionDraft } from '../store/useStore'
import { useI18n } from '../i18n'

interface SubscriptionFormProps {
  subscription?: Subscription
  settings: Settings
  onSubmit: (values: SubscriptionDraft) => void
  onCancel: () => void
  submitLabel?: string
}

const SubscriptionForm = ({ subscription, settings, onSubmit, onCancel, submitLabel }: SubscriptionFormProps) => {
  const { t, locale } = useI18n()
  const resolvedSubmitLabel = submitLabel ?? t('subscriptionForm.save')
  const defaultValues = useMemo<SubscriptionFormValues>(() => {
    if (!subscription) {
      return {
        name: '',
        price: 0,
        currency: settings.defaultCurrency,
        endAt: toDateInputValue(new Date().toISOString()),
        category: '',
        vendor: '',
        notes: '',
        status: 'active',
      }
    }
    return {
      name: subscription.name,
      price: subscription.price,
      currency: subscription.currency,
      endAt: toDateInputValue(subscription.endAt),
      category: subscription.category ?? '',
      vendor: subscription.vendor ?? '',
      notes: subscription.notes ?? '',
      status: subscription.status,
    }
  }, [settings.defaultCurrency, subscription])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    watch,
    reset,
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues,
    mode: 'onBlur',
  })

  const currentStatus = watch('status')
  const currentName = watch('name')
  const displayName = currentName || t('subscriptionForm.newName')

  const handleFormSubmit = handleSubmit((values) => {
    const endAtIso =
      fromDateInputValue(values.endAt, settings.timezone) ?? new Date(values.endAt).toISOString()

    const payload: SubscriptionDraft = {
      name: values.name.trim(),
      price: values.price,
      currency: values.currency,
      endAt: endAtIso,
      category: values.category?.trim() || undefined,
      vendor: values.vendor?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
      status: values.status,
      nextReminderAt: subscription?.nextReminderAt,
      lastNotifiedAt: subscription?.lastNotifiedAt,
    }

    onSubmit(payload)
    reset(values)
  })

  return (
    <form onSubmit={handleFormSubmit} className="glass-card flex flex-col gap-6 rounded-3xl p-6 shadow-card">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">{t('subscriptionForm.name')}</span>
          <input
            {...register('name')}
            type="text"
            className="rounded-full border border-white/60 bg-white/80 px-4 py-2 focus-ring"
            placeholder={t('subscriptionForm.namePlaceholder')}
          />
          {errors.name ? <span className="text-xs text-rose-500">{errors.name.message}</span> : null}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">{t('subscriptionForm.price')}</span>
          <div className="flex items-center gap-2">
            <input
              {...register('price', { valueAsNumber: true })}
              type="number"
              min={0}
              step={0.01}
              className="w-full rounded-full border border-white/60 bg-white/80 px-4 py-2 focus-ring"
              placeholder={t('subscriptionForm.pricePlaceholder')}
            />
            <select
              {...register('currency')}
              className="w-28 rounded-full border border-white/60 bg-white/80 px-3 py-2 focus-ring"
            >
              {SUPPORTED_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
          {errors.price ? <span className="text-xs text-rose-500">{errors.price.message}</span> : null}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">{t('subscriptionForm.paidThrough')}</span>
          <input
            {...register('endAt')}
            type="date"
            className="rounded-full border border-white/60 bg-white/80 px-4 py-2 focus-ring"
          />
          {errors.endAt ? <span className="text-xs text-rose-500">{errors.endAt.message}</span> : null}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">{t('subscriptionForm.status')}</span>
          <select
            {...register('status')}
            className="rounded-full border border-white/60 bg-white/80 px-4 py-2 focus-ring"
          >
            <option value="active">{t('status.active')}</option>
            <option value="canceled">{t('status.canceled')}</option>
            <option value="expired">{t('status.expired')}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">{t('subscriptionForm.vendor')}</span>
          <input
            {...register('vendor')}
            type="text"
            placeholder={t('subscriptionForm.vendorPlaceholder')}
            className="rounded-full border border-white/60 bg-white/80 px-4 py-2 focus-ring"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">{t('subscriptionForm.category')}</span>
          <input
            {...register('category')}
            type="text"
            placeholder={t('subscriptionForm.categoryPlaceholder')}
            className="rounded-full border border-white/60 bg-white/80 px-4 py-2 focus-ring"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">{t('subscriptionForm.notes')}</span>
        <textarea
          {...register('notes')}
          rows={4}
          placeholder={t('subscriptionForm.notesPlaceholder')}
          className="rounded-3xl border border-white/60 bg-white/80 px-4 py-3 focus-ring"
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-midnight/60">
          <p>
            {locale === 'ru' ? 'Сейчас ' : null}
            <span className="font-semibold text-midnight">
              {locale === 'ru' ? `«${displayName}»` : displayName}
            </span>{' '}
            {t('subscriptionForm.statusIndicator')}{' '}
            <span className="uppercase tracking-[0.2em] text-midnight/70">{t(`status.${currentStatus}`)}</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="pill-button" onClick={onCancel}>
            {t('subscriptionForm.cancel')}
          </button>
          <button
            type="submit"
            className="pill-button bg-accent text-white shadow-card hover:bg-accent/90"
            disabled={isSubmitting || !isDirty}
          >
            {resolvedSubmitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}

export default SubscriptionForm
