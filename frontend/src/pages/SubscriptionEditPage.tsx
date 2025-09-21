import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import SubscriptionForm from '../components/SubscriptionForm'
import EmptyState from '../components/EmptyState'
import { selectSettings, selectSubscriptions, useStore } from '../store/useStore'

const SubscriptionEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const subscriptions = useStore(selectSubscriptions)
  const settings = useStore(selectSettings)
  const update = useStore((state) => state.updateSubscription)
  const pushToast = useStore((state) => state.pushToast)
  const navigate = useNavigate()

  const subscription = useMemo(() => subscriptions.find((item) => item.id === id), [subscriptions, id])

  if (!subscription) {
    return (
      <EmptyState
        title="Subscription missing"
        description="We couldn’t find that subscription. It may have been deleted."
        actionLabel="Back to list"
        actionTo="/subscriptions"
      />
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-section accent-dot">Edit subscription</p>
      <SubscriptionForm
        subscription={subscription}
        settings={settings}
        onSubmit={(values) => {
          const updated = update(subscription.id, values)
          pushToast({
            title: 'Updated',
            description: `${updated?.name ?? subscription.name} refreshed.`,
            variant: 'success',
          })
          navigate('/subscriptions')
        }}
        onCancel={() => navigate(-1)}
        submitLabel="Update subscription"
      />
    </div>
  )
}

export default SubscriptionEditPage
