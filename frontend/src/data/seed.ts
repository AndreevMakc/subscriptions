import { addDays } from 'date-fns'
import type { Subscription } from '../types'
import { createId } from '../utils/id'

export const createDemoSubscriptions = (): Subscription[] => {
  const now = new Date()
  const nowIso = now.toISOString()

  const templates = [
    {
      name: 'Netflix',
      price: 9.99,
      currency: 'USD' as const,
      endAt: addDays(now, 5).toISOString(),
      category: 'Entertainment',
      vendor: 'Netflix',
    },
    {
      name: 'Figma',
      price: 12,
      currency: 'USD' as const,
      endAt: addDays(now, -2).toISOString(),
      category: 'Work',
      vendor: 'Figma',
    },
    {
      name: 'Spotify',
      price: 4.99,
      currency: 'EUR' as const,
      endAt: addDays(now, 15).toISOString(),
      category: 'Music',
      vendor: 'Spotify',
    },
  ]

  return templates.map((template) => ({
    id: createId(),
    ...template,
    status: 'active',
    createdAt: nowIso,
    updatedAt: nowIso,
  }))
}
