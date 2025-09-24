import { useNavigate } from 'react-router-dom'
import SubscriptionForm from '../components/SubscriptionForm'
import { selectSettings, useStore } from '../store/useStore'
import { useI18n } from '../i18n'

const SubscriptionNewPage = () => {
  const settings = useStore(selectSettings)
  const add = useStore((state) => state.addSubscription)
  const pushToast = useStore((state) => state.pushToast)
  const navigate = useNavigate()
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <p className="text-section accent-dot">{t('newSubscription.title')}</p>
      <SubscriptionForm
        settings={settings}
        onSubmit={async (values) => {
          try {
            const created = await add(values)
            pushToast({
              title: t('newSubscription.toast.title'),
              description: t('newSubscription.toast.description', { name: created.name }),
              variant: 'success',
            })
            navigate('/subscriptions')
            return created
          } catch (error) {
            console.error('Failed to create subscription', error)
            pushToast({
              title: t('newSubscription.toast.errorTitle'),
              description: t('newSubscription.toast.errorDescription'),
              variant: 'error',
            })
            throw error
          }
        }}
        onCancel={() => navigate(-1)}
      />
    </div>
  )
}

export default SubscriptionNewPage
