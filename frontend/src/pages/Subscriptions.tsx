import { useMemo, useState } from 'react'
import EmptyState from '../components/EmptyState'
import FiltersBar from '../components/FiltersBar'
import SubscriptionCard from '../components/SubscriptionCard'
import { useStore } from '../store/useStore'
import type { Status } from '../types'
import {
  categoriesFromSubscriptions,
  computedStatus,
  filterSubscriptions,
  sortSubscriptions,
  vendorsFromSubscriptions,
} from '../utils/subscriptions'

const SubscriptionsPage = () => {
  const subscriptions = useStore((state) => state.subscriptions)
  const settings = useStore((state) => state.settings)
  const archiveSubscription = useStore((state) => state.archiveSubscription)
  const removeSubscription = useStore((state) => state.removeSubscription)
  const snoozeSubscription = useStore((state) => state.snoozeSubscription)
  const setConfirm = useStore((state) => state.setConfirm)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all')
  const [category, setCategory] = useState<string | undefined>(undefined)
  const [vendor, setVendor] = useState<string | undefined>(undefined)
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined)
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined)
  const [sort, setSort] = useState<'nextRenewal' | 'priceHigh' | 'priceLow' | 'name' | 'recent'>('nextRenewal')

  const categories = useMemo(() => categoriesFromSubscriptions(subscriptions), [subscriptions])
  const vendors = useMemo(() => vendorsFromSubscriptions(subscriptions), [subscriptions])

  const filtered = useMemo(() => {
    const filters = {
      status: statusFilter,
      category,
      vendor,
      search,
      minPrice,
      maxPrice,
      includeArchived: false,
    }
    const result = filterSubscriptions(subscriptions, filters)
    return sortSubscriptions(result, sort)
  }, [subscriptions, statusFilter, category, vendor, search, minPrice, maxPrice, sort])

  const handleRemove = (id: string, name: string) => {
    setConfirm({
      title: 'Remove subscription',
      description: `Permanently delete ${name}? This cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: () => removeSubscription(id),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <FiltersBar
        search={search}
        onSearchChange={setSearch}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        category={category}
        onCategoryChange={setCategory}
        vendor={vendor}
        onVendorChange={setVendor}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onPriceChange={({ min, max }) => {
          setMinPrice(min)
          setMaxPrice(max)
        }}
        sort={sort}
        onSortChange={setSort}
        categories={categories}
        vendors={vendors}
        onReset={() => {
          setSearch('')
          setStatusFilter('all')
          setCategory(undefined)
          setVendor(undefined)
          setMinPrice(undefined)
          setMaxPrice(undefined)
          setSort('nextRenewal')
        }}
      />
      {filtered.length === 0 ? (
        <EmptyState
          title="No subscriptions found"
          description="Try adjusting the filters or add a new subscription to begin tracking your services."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {filtered.map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              status={computedStatus(subscription)}
              settings={settings}
              onArchive={archiveSubscription}
              onRemove={(id) => handleRemove(id, subscription.name)}
              onSnooze={snoozeSubscription}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default SubscriptionsPage
