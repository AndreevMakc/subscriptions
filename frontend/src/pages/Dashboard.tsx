import { useMemo } from 'react'
import ReminderList from '../components/ReminderList'
import Sparkline from '../components/Sparkline'
import StatsCards, { type StatCard } from '../components/StatsCards'
import { useStore } from '../store/useStore'
import { formatMoney, normalizeToUSD, totalsPerCurrency } from '../utils/money'
import { computedStatus, monthlySparklineData, remindersDue } from '../utils/subscriptions'

const DashboardPage = () => {
  const subscriptions = useStore((state) => state.subscriptions)
  const settings = useStore((state) => state.settings)
  const snoozeSubscription = useStore((state) => state.snoozeSubscription)

  const computed = useMemo(
    () => subscriptions.map((subscription) => ({ subscription, status: computedStatus(subscription) })),
    [subscriptions],
  )

  const active = useMemo(() => computed.filter((item) => item.status === 'active').map((item) => item.subscription), [computed])

  const reminderItems = useMemo(
    () =>
      remindersDue(
        computed.map((item) => ({ ...item.subscription, status: item.status })),
        settings,
      ).sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime()),
    [computed, settings],
  )

  const sparkline = useMemo(() => monthlySparklineData(subscriptions), [subscriptions])

  const totalsMap = useMemo(() => totalsPerCurrency(active), [active])

  const totalsString = useMemo(() => {
    const segments: string[] = []
    totalsMap.forEach((value, currency) => {
      segments.push(formatMoney(Number(value.toFixed(2)), currency, settings.locale))
    })
    return segments.join(' · ')
  }, [totalsMap, settings.locale])

  const normalizedUsd = useMemo(() => normalizeToUSD(active), [active])

  const stats: StatCard[] = [
    {
      title: 'Active Subscriptions',
      value: `${active.length}`,
      subtitle: `${subscriptions.length} total managed`,
      accent: 'mint',
    },
    {
      title: 'Monthly Spend',
      value: totalsString || formatMoney(0, settings.defaultCurrency, settings.locale),
      subtitle: 'Across all active subscriptions',
      accent: 'accent',
    },
    {
      title: 'USD Equivalent',
      value: formatMoney(Number(normalizedUsd.toFixed(2)), 'USD', settings.locale),
      subtitle: `${reminderItems.length} due soon`,
      accent: 'lavender',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <StatsCards items={stats} />
        </div>
        <div className="glass-card flex w-full max-w-sm flex-col justify-between rounded-4xl p-6 shadow-card-soft">
          <div>
            <p className="section-label mb-3">Last 12 months</p>
            <p className="text-sm text-slate-500">Active value snapshot per month</p>
          </div>
          <div className="mt-4"><Sparkline data={sparkline} /></div>
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-500">
            Latest month · {sparkline.at(-1)?.month ?? ''} · {sparkline.at(-1)?.total.toFixed(2)}
          </p>
        </div>
      </section>
      <ReminderList items={reminderItems.slice(0, 6)} settings={settings} onSnooze={snoozeSubscription} />
    </div>
  )
}

export default DashboardPage
