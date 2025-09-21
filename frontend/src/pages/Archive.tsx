import EmptyState from '../components/EmptyState'
import SubscriptionCard from '../components/SubscriptionCard'
import { useStore } from '../store/useStore'
import { computedStatus } from '../utils/subscriptions'
import { useNavigate } from 'react-router-dom'

const ArchivePage = () => {
  const navigate = useNavigate()
  const subscriptions = useStore((state) => state.subscriptions)
  const settings = useStore((state) => state.settings)
  const restoreSubscription = useStore((state) => state.restoreSubscription)
  const removeSubscription = useStore((state) => state.removeSubscription)
  const setConfirm = useStore((state) => state.setConfirm)

  const archived = subscriptions.filter((subscription) => computedStatus(subscription) === 'archived')

  const handleRemove = (id: string, name: string) => {
    setConfirm({
      title: 'Delete archived subscription',
      description: `Permanently remove ${name}?`,
      confirmLabel: 'Delete',
      onConfirm: () => removeSubscription(id),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card rounded-4xl px-6 py-5 shadow-card-soft">
        <p className="section-label mb-2">Archive</p>
        <h1 className="text-2xl font-semibold text-midnight">Archived subscriptions</h1>
        <p className="text-sm text-slate-600">
          Restore subscriptions when you want them back in rotation or delete to remove them entirely.
        </p>
      </div>
      {archived.length === 0 ? (
        <EmptyState
          title="Archive is empty"
          description="Archived subscriptions will appear here."
          action={
            <button type="button" className="pill-button bg-white/70 text-midnight" onClick={() => navigate(-1)}>
              Go back
            </button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {archived.map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              status="archived"
              settings={settings}
              onRestore={restoreSubscription}
              onRemove={(id) => handleRemove(id, subscription.name)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ArchivePage
