import StatsCards from '../components/StatsCards'
import ReminderList from '../components/ReminderList'
import Sparkline from '../components/Sparkline'
import { selectSettings, selectSubscriptions, useStore } from '../store/useStore'
import { shouldShowInReminders, monthlySparkline } from '../utils/subscriptions'
import { useI18n } from '../i18n'

const DashboardPage = () => {
  const subscriptions = useStore(selectSubscriptions)
  const settings = useStore(selectSettings)
  const snoozeSubscription = useStore((state) => state.snoozeSubscription)
  const clearReminder = useStore((state) => state.clearReminder)
  const pushToast = useStore((state) => state.pushToast)
  const { t } = useI18n()

  const remindersDue = subscriptions.filter((subscription) => shouldShowInReminders(subscription, settings)).length
  const sparkline = monthlySparkline(subscriptions)

  return (
    <div className="space-y-6">
      <StatsCards subscriptions={subscriptions} settings={settings} remindersDue={remindersDue} />

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-section accent-dot">{t('reminders.queue')}</p>
            <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-midnight/70">
              {t('reminders.badge', { count: remindersDue })}
            </span>
          </div>
          <ReminderList
            subscriptions={subscriptions}
            settings={settings}
            onSnooze={async (id) => {
              try {
                await snoozeSubscription(id)
              } catch (error) {
                console.error('Failed to snooze reminder', error)
                pushToast({
                  title: t('reminders.toast.snoozeError.title'),
                  description: t('reminders.toast.snoozeError.description'),
                  variant: 'error',
                })
              }
            }}
            onClearReminder={async (id) => {
              try {
                await clearReminder(id)
              } catch (error) {
                console.error('Failed to clear reminder', error)
                pushToast({
                  title: t('reminders.toast.clearError.title'),
                  description: t('reminders.toast.clearError.description'),
                  variant: 'error',
                })
              }
            }}
          />
        </div>
        <Sparkline data={sparkline} />
      </section>
    </div>
  )
}

export default DashboardPage
