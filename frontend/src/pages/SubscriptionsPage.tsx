import { useMemo, useState } from 'react'
import FiltersBar from '../components/FiltersBar'
import SubscriptionCard from '../components/SubscriptionCard'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { selectSettings, selectSubscriptions, useStore } from '../store/useStore'
import {
  categoriesFrom,
  filterSubscriptions,
  sortSubscriptions,
  type SubscriptionFilters,
  type SubscriptionSort,
  vendorsFrom,
} from '../utils/subscriptions'

const SubscriptionsPage = () => {
  const subscriptions = useStore(selectSubscriptions)
  const settings = useStore(selectSettings)
  const archive = useStore((state) => state.archiveSubscription)
  const remove = useStore((state) => state.removeSubscription)
  const pushToast = useStore((state) => state.pushToast)

  const [filters, setFilters] = useState<SubscriptionFilters>({})
  const [sort, setSort] = useState<SubscriptionSort>('nextDue')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const categories = useMemo(() => categoriesFrom(subscriptions), [subscriptions])
  const vendors = useMemo(() => vendorsFrom(subscriptions), [subscriptions])

  const filtered = useMemo(() => {
    const base = filterSubscriptions(subscriptions, filters)
    return sortSubscriptions(base, sort)
  }, [subscriptions, filters, sort])

  const handleArchive = (id: string) => {
    archive(id)
    pushToast({ title: 'Archived', description: 'Subscription moved to archive.', variant: 'info' })
  }

  const handleDelete = () => {
    if (!confirmId) return
    remove(confirmId)
    pushToast({ title: 'Removed', description: 'Subscription deleted permanently.', variant: 'info' })
    setConfirmId(null)
  }

  return (
    <div className="space-y-6">
      <FiltersBar
        filters={filters}
        sort={sort}
        categories={categories}
        vendors={vendors}
        onFiltersChange={setFilters}
        onSortChange={setSort}
        onClear={() => setFilters({})}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="No subscriptions"
          description="Adjust filters or add your first subscription to get started."
          actionLabel="Add subscription"
          actionTo="/subscriptions/new"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              settings={settings}
              onArchive={handleArchive}
              onDelete={(id) => setConfirmId(id)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete subscription?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}

export default SubscriptionsPage
