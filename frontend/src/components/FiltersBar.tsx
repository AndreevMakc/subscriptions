import type { ChangeEvent } from 'react'
import type { SubscriptionFilters, SubscriptionSort } from '../utils/subscriptions'
import { useI18n } from '../i18n'

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
  const { t } = useI18n()
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
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">{t('filters.searchLabel')}</span>
          <input
            type="search"
            name="text"
            value={filters.text ?? ''}
            onChange={handleInputChange}
            placeholder={t('filters.searchPlaceholder')}
            className="mt-1 w-full rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm shadow-inner-soft focus-ring"
          />
        </label>
        <label className="md:w-56">
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">{t('filters.sortLabel')}</span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SubscriptionSort)}
            className="mt-1 w-full rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm focus-ring"
          >
            <option value="nextDue">{t('filters.sort.nextDue')}</option>
            <option value="priceDesc">{t('filters.sort.priceDesc')}</option>
            <option value="priceAsc">{t('filters.sort.priceAsc')}</option>
            <option value="name">{t('filters.sort.name')}</option>
            <option value="createdAt">{t('filters.sort.createdAt')}</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">{t('filters.statusLabel')}</span>
          <select
            name="status"
            value={filters.status ?? 'all'}
            onChange={handleInputChange}
            className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm focus-ring"
          >
            <option value="all">{t('filters.status.all')}</option>
            <option value="active">{t('status.active')}</option>
            <option value="canceled">{t('status.canceled')}</option>
            <option value="expired">{t('status.expired')}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">{t('filters.categoryLabel')}</span>
          <select
            name="category"
            value={filters.category ?? ''}
            onChange={handleInputChange}
            className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm focus-ring"
          >
            <option value="">{t('filters.category.any')}</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">{t('filters.vendorLabel')}</span>
          <select
            name="vendor"
            value={filters.vendor ?? ''}
            onChange={handleInputChange}
            className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm focus-ring"
          >
            <option value="">{t('filters.vendor.any')}</option>
            {vendors.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">{t('filters.minPrice')}</span>
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
            <span className="text-xs uppercase tracking-[0.2em] text-midnight/50">{t('filters.maxPrice')}</span>
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
          {t('filters.reset')}
        </button>
      </div>
    </section>
  )
}

export default FiltersBar
