import type { ReactNode } from 'react'

type Props = {
  points: [number, number][]
  /** Dotted reference line (previous close); null = none. */
  baseline: number | null
  up: boolean
}

const WIDTH = 216
const HEIGHT = 80
const PAD = 2

/** Dependency-free area/line sparkline; red when the period is down, green when up (as on Google Finance). */
export default function StockChart({ points, baseline, up }: Props): ReactNode {
  const values = points.map(p => p[1])
  const min = Math.min(...values, baseline ?? Infinity)
  const max = Math.max(...values, baseline ?? -Infinity)
  const span = max - min || 1
  const x = (i: number): number => (i / (points.length - 1)) * WIDTH
  const y = (v: number): number => PAD + (1 - (v - min) / span) * (HEIGHT - PAD * 2)

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p[1]).toFixed(1)}`).join(' ')
  const area = `${line} L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z`
  const color = up ? '#16a34a' : '#ef4444'

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden className="h-20 w-full overflow-visible">
      <defs>
        <linearGradient id="stock-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.3" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={area} fill="url(#stock-fill)" />

      {baseline != null && (
        <line
          x1="0"
          x2={WIDTH}
          y1={y(baseline)}
          y2={y(baseline)}
          stroke="currentColor"
          strokeOpacity="0.4"
          strokeDasharray="2 3"
          vectorEffect="non-scaling-stroke"
        />
      )}

      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={x(points.length - 1)} cy={y(values[values.length - 1]!)} r="2.5" fill={color} />
    </svg>
  )
}
