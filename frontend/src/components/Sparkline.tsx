import type { SparklinePoint } from '../utils/subscriptions'
import { useI18n } from '../i18n'

interface SparklineProps {
  data: SparklinePoint[]
}

const Sparkline = ({ data }: SparklineProps) => {
  const { t, formatMonthLabel } = useI18n()

  if (!data.length) {
    return <p className="text-xs text-midnight/60">{t('sparkline.empty')}</p>
  }

  const values = data.map((point) => point.total)
  const maxValue = Math.max(...values, 1)
  const minValue = Math.min(...values, 0)
  const height = 80
  const width = 240
  const step = width / Math.max(data.length - 1, 1)

  const path = data
    .map((point, index) => {
      const x = index * step
      const normalized = (point.total - minValue) / (maxValue - minValue || 1)
      const y = height - normalized * height
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <div className="glass-card rounded-3xl p-6">
      <p className="text-section accent-dot">{t('sparkline.title')}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-24 w-full">
        <defs>
          <linearGradient id="spark-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f98080" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#f98080" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <path
          d={`${path} L${width},${height} L0,${height} Z`}
          fill="url(#spark-gradient)"
          className="opacity-70"
        />
        <path d={path} fill="none" stroke="#f98080" strokeWidth={3} strokeLinecap="round" />
        {data.map((point, index) => {
          const x = index * step
          const normalized = (point.total - minValue) / (maxValue - minValue || 1)
          const y = height - normalized * height
          return (
            <circle key={point.month} cx={x} cy={y} r={3} fill="#f98080" stroke="white" strokeWidth={2} />
          )
        })}
      </svg>
      <div className="mt-4 grid grid-cols-4 text-xs text-midnight/60">
        {data.slice(-4).map((point) => (
          <div key={point.month} className="text-center">
            <p className="font-medium text-midnight/70">{formatMonthLabel(point.month)}</p>
            <p className="text-[10px]">{point.total.toFixed(0)} USD</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Sparkline
