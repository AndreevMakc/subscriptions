import type { ChangeEvent } from 'react'
import type { SortOption } from '../utils/subscriptions'
import type { Status } from '../types'

interface FiltersBarProps {
  search: string
  onSearchChange: (value: string) => void
  status: Status | 'all'
  onStatusChange: (status: Status | 'all') => void
  category?: string
  onCategoryChange: (value: string | undefined) => void
  vendor?: string
  onVendorChange: (value: string | undefined) => void
  minPrice?: number
  maxPrice?: number
  onPriceChange: (range: { min?: number; max?: number }) => void
  sort: SortOption
  onSortChange: (value: SortOption) => void
  categories: string[]
  vendors: string[]
  onReset: () => void
}

const FiltersBar = ({
  search,
  onSearchChange,
  status,
  onStatusChange,
  category,
  onCategoryChange,
  vendor,
  onVendorChange,
  minPrice,
  maxPrice,
  onPriceChange,
  sort,
  onSortChange,
  categories,
  vendors,
  onReset,
}: FiltersBarProps) => {
  const handlePriceChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    const parsed = value ? Number(value) : undefined
    onPriceChange({
      min: name === 'min' ? parsed : minPrice,
      max: name === 'max' ? parsed : maxPrice,
    })
  }

  return (
    <div className="glass-card rounded-4xl p-6 shadow-card-soft">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="section-label">Filters</p>
        <button type="button" onClick={onReset} className="pill-button bg-white/70 text-xs text-slate-600 hover:bg-white">
          Reset
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Search
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Name, vendor, notes"
            className="input-field"
            type="search"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Status
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value as Status | 'all')}
            className="input-field"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="canceled">Canceled</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Category
          <select
            value={category ?? ''}
            onChange={(event) => onCategoryChange(event.target.value || undefined)}
            className="input-field"
          >
            <option value="">All</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Vendor
          <select
            value={vendor ?? ''}
            onChange={(event) => onVendorChange(event.target.value || undefined)}
            className="input-field"
          >
            <option value="">All</option>
            {vendors.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-3 rounded-3xl bg-white/60 p-4 text-xs uppercase tracking-[0.2em] text-slate-500 shadow-inner-sm lg:col-span-2">
          <span>Price range</span>
          <div className="grid grid-cols-2 gap-3 text-xs normal-case">
            <label className="flex flex-col gap-1 text-[0.7rem] uppercase tracking-[0.18em] text-slate-500">
              Min
              <input
                name="min"
                type="number"
                min={0}
                value={minPrice ?? ''}
                onChange={handlePriceChange}
                className="input-field"
              />
            </label>
            <label className="flex flex-col gap-1 text-[0.7rem] uppercase tracking-[0.18em] text-slate-500">
              Max
              <input
                name="max"
                type="number"
                min={0}
                value={maxPrice ?? ''}
                onChange={handlePriceChange}
                className="input-field"
              />
            </label>
          </div>
        </div>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Sort by
          <select value={sort} onChange={(event) => onSortChange(event.target.value as SortOption)} className="input-field">
            <option value="nextRenewal">Next renewal</option>
            <option value="recent">Recently added</option>
            <option value="priceHigh">Price (high to low)</option>
            <option value="priceLow">Price (low to high)</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>
    </div>
  )
}

export default FiltersBar
