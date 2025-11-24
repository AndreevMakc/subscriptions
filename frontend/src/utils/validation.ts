import { z } from 'zod'
import type { Currency } from '../types'
import { SUPPORTED_CURRENCIES } from './constants'

const currencyValues = SUPPORTED_CURRENCIES as [Currency, ...Currency[]]
const statusValues = ['active', 'canceled', 'expired', 'archived'] as const

const currencyEnum = z.enum(currencyValues)
const statusEnum = z.enum(statusValues)

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : undefined))
  .optional()

export const subscriptionSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'Name must include at least 2 characters'),
  price: z
    .number()
    .refine((value) => Number.isFinite(value), 'Enter a price')
    .gt(0, 'Price must be greater than zero'),
  currency: currencyEnum,
  endAt: z
    .string()
    .min(1, 'Select an end date')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'End date must be valid'),
  notes: optionalText,
  category: optionalText,
  vendor: optionalText,
  status: statusEnum,
  nextReminderAt: z.string().optional().nullable(),
  lastNotifiedAt: z.string().optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const subscriptionFormSchema = subscriptionSchema.pick({
  name: true,
  price: true,
  currency: true,
  endAt: true,
  notes: true,
  category: true,
  vendor: true,
  status: true,
})

export type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>

export const settingsSchema = z.object({
  locale: z.enum(['en', 'ru']),
  timezone: z.string().min(1, 'Timezone is required'),
  defaultCurrency: currencyEnum,
  reminderDaysBefore: z
    .number()
    .refine((value) => Number.isFinite(value), 'Reminder window should be a number')
    .int()
    .min(0, 'Reminder window must be positive')
    .max(60, 'Let’s keep it under 60 days'),
  email: optionalText,
})

export const persistedStateSchema = z.object({
  subscriptions: z.array(subscriptionSchema),
  settings: settingsSchema,
})

export type SettingsFormValues = z.infer<typeof settingsSchema>
