import clsx from 'clsx'

export interface StatCard {
  title: string
  value: string
  subtitle?: string
  trendLabel?: string
  accent?: 'mint' | 'accent' | 'lavender'
}

interface StatsCardsProps {
  items: StatCard[]
}

const accentRing: Record<NonNullable<StatCard['accent']>, string> = {
  mint: 'ring-mint/50',
  accent: 'ring-accent/40',
  lavender: 'ring-lavender/50',
}

const StatsCards = ({ items }: StatsCardsProps) => {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.title}
          className={clsx(
            'glass-card rounded-4xl px-6 py-6 shadow-card-soft transition hover:-translate-y-1 hover:shadow-card',
            item.accent ? `ring-2 ${accentRing[item.accent]}` : 'ring-1 ring-white/40',
          )}
        >
          <p className="section-label mb-3">{item.title}</p>
          <p className="text-3xl font-semibold text-midnight">{item.value}</p>
          {item.subtitle ? <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p> : null}
          {item.trendLabel ? (
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-500">{item.trendLabel}</p>
          ) : null}
        </div>
      ))}
    </section>
  )
}

export default StatsCards
