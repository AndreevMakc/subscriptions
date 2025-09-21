import { useNavigate } from 'react-router-dom'
import SubscriptionForm from '../components/SubscriptionForm'
import { selectSettings, useStore } from '../store/useStore'

const SubscriptionNewPage = () => {
  const settings = useStore(selectSettings)
  const add = useStore((state) => state.addSubscription)
  const pushToast = useStore((state) => state.pushToast)
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <p className="text-section accent-dot">New subscription</p>
      <SubscriptionForm
        settings={settings}
        onSubmit={(values) => {
          const created = add(values)
          pushToast({
            title: 'Added',
            description: `${created.name} is now tracked.`,
            variant: 'success',
          })
          navigate('/subscriptions')
        }}
        onCancel={() => navigate(-1)}
        submitLabel="Save subscription"
      />
    </div>
  )
}

export default SubscriptionNewPage
