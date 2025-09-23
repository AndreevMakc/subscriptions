import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import SubscriptionForm from '../components/SubscriptionForm'
import EmptyState from '../components/EmptyState'
import { selectSettings, selectSubscriptions, useStore } from '../store/useStore'
import { useI18n } from '../i18n'

const SubscriptionEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const subscriptions = useStore(selectSubscriptions)
  const settings = useStore(selectSettings)
  const update = useStore((state) => state.updateSubscription)
  const pushToast = useStore((state) => state.pushToast)
  const navigate = useNavigate()
  const { t } = useI18n()

  const subscription = useMemo(() => subscriptions.find((item) => item.id === id), [subscriptions, id])

  if (!subscription) {
    return (
      <EmptyState
        title={t('editSubscription.missingTitle')}
        description={t('editSubscription.missingDescription')}
        actionLabel={t('editSubscription.back')}
        actionTo="/subscriptions"
      />
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-section accent-dot">{t('editSubscription.title')}</p>
      <SubscriptionForm
        subscription={subscription}
        settings={settings}
        onSubmit={async (values) => {
          try {
            const updated = await update(subscription.id, values)
            pushToast({
              title: t('editSubscription.toast.title'),
              description: t('editSubscription.toast.description', {
                name: updated?.name ?? subscription.name,
              }),
              variant: 'success',
            })
            navigate('/subscriptions')
          } catch (error) {
            console.error(error)
            pushToast({
              title: t('toast.error.generic.title'),
              description: t('toast.error.generic.description'),
              variant: 'error',
            })
          }
        }}
        onCancel={() => navigate(-1)}
        submitLabel={t('subscriptionForm.update')}
      />
    </div>
  )
}

export default SubscriptionEditPage
