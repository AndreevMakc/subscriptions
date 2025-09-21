import StatsCards from '../components/StatsCards'
import ReminderList from '../components/ReminderList'
import Sparkline from '../components/Sparkline'
import { selectSettings, selectSubscriptions, useStore } from '../store/useStore'
import { shouldShowInReminders, monthlySparkline } from '../utils/subscriptions'

const DashboardPage = () => {
  const subscriptions = useStore(selectSubscriptions)
  const settings = useStore(selectSettings)
  const snooze = useStore((state) => state.snoozeSubscription)
  const clearReminder = useStore((state) => state.clearReminder)

  const remindersDue = subscriptions.filter((subscription) => shouldShowInReminders(subscription, settings)).length
  const sparkline = monthlySparkline(subscriptions)

  return (
    <div className="space-y-6">
      <StatsCards subscriptions={subscriptions} settings={settings} remindersDue={remindersDue} />

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-section accent-dot">Reminder queue</p>
            <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-midnight/70">
              {remindersDue} due
            </span>
          </div>
          <ReminderList
            subscriptions={subscriptions}
            settings={settings}
            onSnooze={snooze}
            onClearReminder={clearReminder}
          />
        </div>
        <Sparkline data={sparkline} />
      </section>
    </div>
  )
}

export default DashboardPage
