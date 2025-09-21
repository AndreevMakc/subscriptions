import type { ChangeEvent } from 'react'
import type { SubscriptionFilters, SubscriptionSort } from '../utils/subscriptions'

interface FiltersBarProps {
  filters: SubscriptionFilters
  sort: SubscriptionSort
  categories: string[]
  vendors: string[]
  onFiltersChange: (filters: SubscriptionFilters) => void
  onSortChange: (sort: SubscriptionSort) => void
  onClear: () => void
}

const FiltersBar = ({
  filters,
  sort,
  categories,
  vendors,
  onFiltersChange,
  onSortChange,
  onClear,
}: FiltersBarProps) => {
  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    if (name === 'minPrice' || name === 'maxPrice') {
      const parsed = value === '' ? undefined : Number.parseFloat(value)
      onFiltersChange({ ...filters, [name]: Number.isNaN(parsed) ? undefined : parsed })
      return
    }
    onFiltersChange({ ...filters, [name]: value === 'all' ? undefined : value })
  }

  return (
    <section className="glass-card flex flex-col gap-4 rounded-3xl p-5 text-sm shadow-card">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <label className="flex-1">
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">Search</span>
          <input
            type="search"
            name="text"
            value={filters.text ?? ''}
            onChange={handleInputChange}
            placeholder="Name, vendor, notes..."
            className="mt-1 w-full rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm shadow-inner-soft focus-ring"
          />
        </label>
        <label className="md:w-56">
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">Sort</span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SubscriptionSort)}
            className="mt-1 w-full rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm focus-ring"
          >
            <option value="nextDue">Next due</option>
            <option value="priceDesc">Price high → low</option>
            <option value="priceAsc">Price low → high</option>
            <option value="name">Alphabetical</option>
            <option value="createdAt">Recently added</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">Status</span>
          <select
            name="status"
            value={filters.status ?? 'all'}
            onChange={handleInputChange}
            className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm focus-ring"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="canceled">Canceled</option>
            <option value="expired">Expired</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">Category</span>
          <select
            name="category"
            value={filters.category ?? ''}
            onChange={handleInputChange}
            className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm focus-ring"
          >
            <option value="">Any</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">Vendor</span>
          <select
            name="vendor"
            value={filters.vendor ?? ''}
            onChange={handleInputChange}
            className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm focus-ring"
          >
            <option value="">Any</option>
            {vendors.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">Min price</span>
            <input
              type="number"
              name="minPrice"
              value={filters.minPrice ?? ''}
              min={0}
              step={0.5}
              onChange={handleInputChange}
              className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm focus-ring"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">Max price</span>
            <input
              type="number"
              name="maxPrice"
              value={filters.maxPrice ?? ''}
              min={0}
              step={0.5}
              onChange={handleInputChange}
              className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm focus-ring"
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" className="pill-button" onClick={onClear}>
          Reset filters
        </button>
      </div>
    </section>
  )
}

export default FiltersBar
