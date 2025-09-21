interface SparklinePoint {
  month: string
  total: number
}

interface SparklineProps {
  data: SparklinePoint[]
}

const Sparkline = ({ data }: SparklineProps) => {
  if (!data.length) {
    return null
  }
  const width = 120
  const height = 48
  const max = Math.max(...data.map((point) => point.total), 1)
  const points = data.map((point, index) => {
    const x = (index / (data.length - 1 || 1)) * width
    const y = height - (point.total / max) * height
    return { x, y }
  })
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(' ')
  const areaPath = `M0,${height} ${points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ')} L${width},${height} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full sparkline-gradient rounded-3xl">
      <defs>
        <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(240, 100, 140, 0.45)" />
          <stop offset="100%" stopColor="rgba(205, 184, 255, 0.1)" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparklineGradient)" opacity={0.6} />
      <path d={path} fill="none" stroke="rgba(240, 100, 140, 0.9)" strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  )
}

export default Sparkline
