import { zodResolver } from '@hookform/resolvers/zod'
import { formatISO, isValid } from 'date-fns'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Settings, Subscription } from '../types'
import type { SubscriptionDraft } from '../store/useStore'

const currencies = ['USD', 'EUR', 'GBP', 'RUB', 'UAH', 'KZT', 'BYN'] as const
const statusOptions = ['active', 'canceled'] as const

const subscriptionSchema = z.object({
  name: z.string().min(2, 'Name should be at least 2 characters'),
  price: z.coerce.number().positive('Price must be greater than zero'),
  currency: z.enum(currencies),
  endAt: z.string().min(1, 'End date is required'),
  notes: z
    .string()
    .max(500, 'Notes should be shorter than 500 characters')
    .transform((value) => value.trim())
    .optional()
    .transform((value) => (value ? value : undefined)),
  category: z
    .string()
    .max(120, 'Category should be shorter than 120 characters')
    .transform((value) => value.trim())
    .optional()
    .transform((value) => (value ? value : undefined)),
  vendor: z
    .string()
    .max(120, 'Vendor should be shorter than 120 characters')
    .transform((value) => value.trim())
    .optional()
    .transform((value) => (value ? value : undefined)),
  status: z.enum(statusOptions).default('active'),
  nextReminderAt: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
})

type SubscriptionFormValues = z.infer<typeof subscriptionSchema>
type SubscriptionFormInputs = z.input<typeof subscriptionSchema>

interface SubscriptionFormProps {
  settings: Settings
  defaultValues?: Partial<Subscription>
  onSubmit: (values: SubscriptionDraft) => void
  onCancel: () => void
  submitLabel?: string
}

const toDateInput = (value?: string) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (!isValid(parsed)) return ''
  return parsed.toISOString().slice(0, 10)
}

const toDateTimeInput = (value?: string) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (!isValid(parsed)) return ''
  const pad = (v: number) => v.toString().padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

const SubscriptionForm = ({ settings, defaultValues, onSubmit, onCancel, submitLabel = 'Save subscription' }: SubscriptionFormProps) => {
  const form = useForm<SubscriptionFormInputs, unknown, SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      price: defaultValues?.price ?? 0,
      currency: defaultValues?.currency ?? settings.defaultCurrency,
      endAt: toDateInput(defaultValues?.endAt) || toDateInput(formatISO(new Date())),
      notes: defaultValues?.notes ?? '',
      category: defaultValues?.category ?? '',
      vendor: defaultValues?.vendor ?? '',
      status: (defaultValues?.status === 'canceled' ? 'canceled' : 'active') as (typeof statusOptions)[number],
      nextReminderAt: toDateTimeInput(defaultValues?.nextReminderAt),
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = form

  useEffect(() => {
    reset({
      name: defaultValues?.name ?? '',
      price: defaultValues?.price ?? 0,
      currency: defaultValues?.currency ?? settings.defaultCurrency,
      endAt: toDateInput(defaultValues?.endAt) || toDateInput(formatISO(new Date())),
      notes: defaultValues?.notes ?? '',
      category: defaultValues?.category ?? '',
      vendor: defaultValues?.vendor ?? '',
      status: (defaultValues?.status === 'canceled' ? 'canceled' : 'active') as (typeof statusOptions)[number],
      nextReminderAt: toDateTimeInput(defaultValues?.nextReminderAt),
    })
  }, [defaultValues, reset, settings.defaultCurrency])

  const submitHandler = handleSubmit((values) => {
    const endDate = new Date(values.endAt)
    if (!isValid(endDate)) {
      form.setError('endAt', { message: 'Please provide a valid date' })
      return
    }

    const payload: SubscriptionDraft = {
      id: defaultValues?.id,
      name: values.name,
      price: values.price,
      currency: values.currency,
      endAt: formatISO(endDate),
      notes: values.notes,
      category: values.category,
      vendor: values.vendor,
      status: values.status,
      nextReminderAt: values.nextReminderAt ? formatISO(new Date(values.nextReminderAt)) : undefined,
      lastNotifiedAt: defaultValues?.lastNotifiedAt,
    }

    onSubmit(payload)
  })

  return (
    <form onSubmit={submitHandler} className="glass-card flex flex-col gap-6 rounded-4xl p-8 shadow-card-soft">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Name
          <input {...register('name')} className="input-field" placeholder="Subscription name" />
          {errors.name ? <span className="text-xs text-rose-600">{errors.name.message}</span> : null}
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Vendor
          <input {...register('vendor')} className="input-field" placeholder="Vendor or provider" />
          {errors.vendor ? <span className="text-xs text-rose-600">{errors.vendor.message}</span> : null}
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Price
          <input type="number" step="0.01" min="0" {...register('price')} className="input-field" />
          {errors.price ? <span className="text-xs text-rose-600">{errors.price.message}</span> : null}
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Currency
          <select {...register('currency')} className="input-field">
            {currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
          {errors.currency ? <span className="text-xs text-rose-600">{errors.currency.message}</span> : null}
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Status
          <select {...register('status')} className="input-field">
            <option value="active">Active</option>
            <option value="canceled">Canceled</option>
          </select>
          {errors.status ? <span className="text-xs text-rose-600">{errors.status.message}</span> : null}
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Category
          <input {...register('category')} className="input-field" placeholder="Category" />
          {errors.category ? <span className="text-xs text-rose-600">{errors.category.message}</span> : null}
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Next reminder (optional)
          <input type="datetime-local" {...register('nextReminderAt')} className="input-field" />
          {errors.nextReminderAt ? <span className="text-xs text-rose-600">{errors.nextReminderAt.message}</span> : null}
        </label>
      </div>
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        End of current period
        <input type="date" {...register('endAt')} className="input-field" />
        {errors.endAt ? <span className="text-xs text-rose-600">{errors.endAt.message}</span> : null}
      </label>
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        Notes
        <textarea rows={3} {...register('notes')} className="input-field" placeholder="Billing cadence, seat count, reminders..." />
        {errors.notes ? <span className="text-xs text-rose-600">{errors.notes.message}</span> : null}
      </label>
      <div className="flex flex-wrap items-center justify-end gap-3 pt-4">
        <button type="button" className="pill-button bg-white/70 text-midnight hover:bg-white" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          className="pill-button bg-accent/80 text-white shadow-card hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting || !isDirty}
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}

export default SubscriptionForm
