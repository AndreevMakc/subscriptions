import { useMemo, useState } from 'react'
import SubscriptionCard from '../components/SubscriptionCard'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { selectSettings, selectSubscriptions, useStore } from '../store/useStore'
import { resolveStatus } from '../utils/subscriptions'
import { useI18n } from '../i18n'

const ArchivePage = () => {
  const subscriptions = useStore(selectSubscriptions)
  const settings = useStore(selectSettings)
  const restore = useStore((state) => state.restoreSubscription)
  const remove = useStore((state) => state.removeSubscription)
  const pushToast = useStore((state) => state.pushToast)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const { t } = useI18n()

  const archived = useMemo(
    () => subscriptions.filter((subscription) => resolveStatus(subscription) === 'archived'),
    [subscriptions],
  )

  const handleRestore = (id: string) => {
    restore(id)
    pushToast({
      title: t('archive.toast.restored.title'),
      description: t('archive.toast.restored.description'),
      variant: 'success',
    })
  }

  const handleDelete = () => {
    if (!confirmId) return
    remove(confirmId)
    pushToast({
      title: t('archive.toast.deleted.title'),
      description: t('archive.toast.deleted.description'),
      variant: 'info',
    })
    setConfirmId(null)
  }

  return (
    <div className="space-y-6">
      <p className="text-section accent-dot">{t('archive.title')}</p>
      {archived.length === 0 ? (
        <EmptyState
          title={t('archive.emptyTitle')}
          description={t('archive.emptyDescription')}
          actionLabel={t('archive.emptyAction')}
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
        title={t('archive.confirmDeleteTitle')}
        description={t('archive.confirmDeleteDescription')}
        confirmLabel={t('archive.confirmDeleteConfirm')}
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}

export default ArchivePage
