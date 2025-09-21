import { useMemo, useState } from 'react'
import SubscriptionCard from '../components/SubscriptionCard'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { selectSettings, selectSubscriptions, useStore } from '../store/useStore'
import { resolveStatus } from '../utils/subscriptions'

const ArchivePage = () => {
  const subscriptions = useStore(selectSubscriptions)
  const settings = useStore(selectSettings)
  const restore = useStore((state) => state.restoreSubscription)
  const remove = useStore((state) => state.removeSubscription)
  const pushToast = useStore((state) => state.pushToast)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const archived = useMemo(
    () => subscriptions.filter((subscription) => resolveStatus(subscription) === 'archived'),
    [subscriptions],
  )

  const handleRestore = (id: string) => {
    restore(id)
    pushToast({ title: 'Restored', description: 'Subscription is active again.', variant: 'success' })
  }

  const handleDelete = () => {
    if (!confirmId) return
    remove(confirmId)
    pushToast({ title: 'Deleted', description: 'Removed from archive.', variant: 'info' })
    setConfirmId(null)
  }

  return (
    <div className="space-y-6">
      <p className="text-section accent-dot">Archived subscriptions</p>
      {archived.length === 0 ? (
        <EmptyState
          title="Archive is empty"
          description="Rest easy knowing everything active is in the main list."
          actionLabel="Back to subscriptions"
          actionTo="/subscriptions"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {archived.map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              settings={settings}
              onRestore={handleRestore}
              onDelete={(id) => setConfirmId(id)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete archived subscription?"
        description="This will permanently remove it from SubsKeeper."
        confirmLabel="Delete"
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}

export default ArchivePage
