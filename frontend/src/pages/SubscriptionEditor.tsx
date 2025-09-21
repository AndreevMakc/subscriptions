import { addDays } from 'date-fns'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import SubscriptionForm from '../components/SubscriptionForm'
import { useStore } from '../store/useStore'
import type { SubscriptionDraft } from '../store/useStore'
import EmptyState from '../components/EmptyState'

interface SubscriptionEditorPageProps {
  mode: 'create' | 'edit'
}

const SubscriptionEditorPage = ({ mode }: SubscriptionEditorPageProps) => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const subscriptions = useStore((state) => state.subscriptions)
  const settings = useStore((state) => state.settings)
  const addSubscription = useStore((state) => state.addSubscription)
  const updateSubscription = useStore((state) => state.updateSubscription)

  const subscription = useMemo(() => subscriptions.find((item) => item.id === id), [subscriptions, id])

  const defaultValues = mode === 'edit' ? subscription : undefined

  const handleSubmit = async (values: SubscriptionDraft) => {
    if (mode === 'edit' && subscription) {
      await updateSubscription(subscription.id, values)
    } else {
      const baseValues = {
        ...values,
        endAt: values.endAt ?? addDays(new Date(), 30).toISOString(),
      }
      await addSubscription(baseValues)
    }
    navigate('/subscriptions')
  }

  if (mode === 'edit' && !subscription) {
    return (
      <EmptyState
        title="Subscription not found"
        description="The subscription you are trying to edit no longer exists."
        action={
          <button type="button" className="pill-button bg-white/70 text-midnight" onClick={() => navigate('/subscriptions')}>
            Back to list
          </button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card rounded-4xl px-6 py-5 shadow-card-soft">
        <p className="section-label mb-2">{mode === 'edit' ? 'Edit subscription' : 'New subscription'}</p>
        <h1 className="text-2xl font-semibold text-midnight">
          {mode === 'edit' ? subscription?.name ?? 'Edit subscription' : 'Add a new subscription'}
        </h1>
        <p className="text-sm text-slate-600">
          Capture billing details, set reminder preferences, and keep your recurring costs in check.
        </p>
      </div>
      <SubscriptionForm
        settings={settings}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/subscriptions')}
        submitLabel={mode === 'edit' ? 'Save changes' : 'Create subscription'}
      />
    </div>
  )
}

export default SubscriptionEditorPage
