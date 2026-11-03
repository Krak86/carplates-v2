import type { ReactNode } from 'react'

import { niceMax, showsLabel } from '@/components/charts/helpers'

export type ChartColumn = {
  key: string
  /** Axis label under the column. */
  label: string
  value: number
  /** A second series drawn as a line with dots (for example the same month a year earlier); null = no point. */
  secondary?: number | null
  /** Tooltip text. */
  title: string
  /** Draw the column dimmed, so another one stands out. */
  faded?: boolean
}

type Props = {
  columns: readonly ChartColumn[]
  ariaLabel: string
  /** Formats the axis values (0, half, max). */
  formatTick: (value: number) => string
  /** Show the label of every n-th column only. */
  labelEvery?: number
  /** Count `labelEvery` from the first or the last column. */
  labelFrom?: 'start' | 'end'
  width?: number
  height?: number
}

const PAD = { left: 52, right: 8, top: 10, bottom: 26 }

/**
 * Plain-SVG column chart on a 0..nice-max axis with an optional line series; colours are the `--age-*` tokens. Shared by the
 * /stats monthly trend, the /wanted year chart and the /road-safety hour and weekday charts.
 */
export default function ColumnChart({
  columns,
  ariaLabel,
  formatTick,
  labelEvery = 1,
  labelFrom = 'end',
  width = 640,
  height = 250
}: Props): ReactNode {
  const max = niceMax(columns.reduce((m, c) => Math.max(m, c.value, c.secondary ?? 0), 0))
  const innerW = width - PAD.left - PAD.right
  const innerH = height - PAD.top - PAD.bottom
  const slot = innerW / Math.max(columns.length, 1)
  const barW = slot * 0.62
  const y = (v: number): number => PAD.top + innerH - (v / max) * innerH
  const x = (i: number): number => PAD.left + slot * i + slot / 2
  const barHeight = (v: number): number => (v > 0 ? Math.max(2, PAD.top + innerH - y(v)) : 0)
  const linePoints = columns.flatMap((c, i) => (c.secondary == null ? [] : [`${x(i)},${y(c.secondary)}`]))

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={ariaLabel}>
      {[0, max / 2, max].map(v => (
        <g key={v}>
          <line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--color-border)"
            strokeDasharray="3 4"
          />
          <text
            x={PAD.left - 6}
            y={y(v)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize="11"
            fill="var(--color-muted)"
          >
            {formatTick(v)}
          </text>
        </g>
      ))}

      {columns.map((c, i) => (
        <g key={c.key}>
          <title>{c.title}</title>
          <rect
            x={x(i) - barW / 2}
            y={PAD.top + innerH - barHeight(c.value)}
            width={barW}
            height={barHeight(c.value)}
            rx="3"
            fill="var(--age-0)"
            opacity={c.faded ? 0.45 : 0.9}
          />
          {showsLabel(i, columns.length, labelEvery, labelFrom) && (
            <text x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--color-muted)">
              {c.label}
            </text>
          )}
        </g>
      ))}

      {linePoints.length > 1 && (
        <polyline
          points={linePoints.join(' ')}
          fill="none"
          stroke="var(--age-3)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      {columns.map((c, i) =>
        c.secondary == null ? null : <circle key={c.key} cx={x(i)} cy={y(c.secondary)} r="3" fill="var(--age-3)" />
      )}
    </svg>
  )
}
