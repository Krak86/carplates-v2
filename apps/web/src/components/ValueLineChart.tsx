import type { ReactNode } from 'react'

import { plotSeries, type ChartBox, type ChartPoint } from '@/components/EstimatedValue.helpers'

type Props = {
  points: readonly ChartPoint[]
  /** The car's own position: a dot on the line at this x, with a bar for its low–high range when given. */
  mark?: { x: number; y: number; low?: number; high?: number }
  ariaLabel: string
  /** Formats an x-axis end label ("2015", "3 y"); y labels are euros formatted by `formatY`. */
  formatX: (x: number) => string
  formatY: (y: number) => string
}

const BOX: ChartBox = { width: 280, height: 110, left: 8, right: 8, top: 14, bottom: 18 }

/** A small dependency-free SVG line chart: y from 0, labels at both ends of x and at the top of y, optional marked car. */
export default function ValueLineChart({ points, mark, ariaLabel, formatX, formatY }: Props): ReactNode {
  if (points.length === 0) return null
  const s = plotSeries(points, BOX, mark ? [mark.x] : [])
  const baseline = s.toPy(0)

  return (
    <svg viewBox={`0 0 ${BOX.width} ${BOX.height}`} role="img" aria-label={ariaLabel} className="h-auto w-full">
      <line
        x1={BOX.left}
        x2={BOX.width - BOX.right}
        y1={baseline}
        y2={baseline}
        stroke="var(--color-border)"
        strokeWidth={1}
      />

      <path d={s.path} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinejoin="round" />

      {s.plotted.length <= 20 &&
        s.plotted.map(p => <circle key={p.point.x} cx={p.px} cy={p.py} r={2} fill="var(--color-primary)" />)}

      {mark && (
        <g>
          {mark.low != null && mark.high != null && (
            <line
              x1={s.toPx(mark.x)}
              x2={s.toPx(mark.x)}
              y1={s.toPy(mark.high)}
              y2={s.toPy(mark.low)}
              stroke="var(--color-green-400)"
              strokeWidth={5}
              strokeLinecap="round"
              opacity={0.5}
            />
          )}
          <circle
            cx={s.toPx(mark.x)}
            cy={s.toPy(mark.y)}
            r={4}
            fill="var(--color-green-400)"
            stroke="var(--color-surface)"
            strokeWidth={1.5}
          />
        </g>
      )}

      <g fill="var(--color-muted)" fontSize={10}>
        <text x={BOX.left} y={BOX.height - 4}>
          {formatX(s.xMin)}
        </text>
        <text x={BOX.width - BOX.right} y={BOX.height - 4} textAnchor="end">
          {formatX(s.xMax)}
        </text>
        <text x={BOX.left} y={9}>
          {formatY(s.yMax)}
        </text>
      </g>
    </svg>
  )
}
