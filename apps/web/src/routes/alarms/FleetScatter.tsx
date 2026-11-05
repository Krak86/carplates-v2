import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { localizeRegion } from '@/lib/region-label'
import { niceMax, tickCount } from '@/routes/alarms/fleet-helpers'
import type { ScatterPoint } from '@/routes/alarms/fleet-helpers'

const W = 420
const H = 280
const PAD = { left: 44, right: 12, top: 10, bottom: 34 }

type Props = {
  points: readonly ScatterPoint[]
  xLabel: string
  yLabel: string
  locale: string
  active: string | null
  onActive: (region: string | null) => void
  onPick: (region: string) => void
}

/**
 * One dot per region: fleet share (x) against hours under alert (y). Hover / focus highlights the region on the map above;
 * click pins it. Plain axes and no trend line on purpose: this shows how two numbers line up, never a cause.
 */
export default function FleetScatter({ points, xLabel, yLabel, locale, active, onActive, onPick }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const xMax = niceMax(Math.max(...points.map(p => p.share), 0))
  const yMax = niceMax(Math.max(...points.map(p => p.hours), 0))
  const x = (v: number): number => PAD.left + (v / xMax) * (W - PAD.left - PAD.right)
  const y = (v: number): number => H - PAD.bottom - (v / yMax) * (H - PAD.top - PAD.bottom)
  const pct = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 })
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  const xTicks = Array.from({ length: tickCount(xMax) + 1 }, (_, i) => i / tickCount(xMax))
  const yTicks = Array.from({ length: tickCount(yMax) + 1 }, (_, i) => i / tickCount(yMax))
  const name = (region: string): string => localizeRegion(region, i18n.language) ?? region
  const describe = (p: ScatterPoint): string =>
    `${name(p.region)}: ${pct.format(p.share)}, ${num.format(p.hours)} ${t('alarms.cars.hours')}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={t('alarms.fleet.chartLabel')} className="w-full max-w-2xl">
      {yTicks.map(f => (
        <g key={`y${f}`} fontSize={10} fill="var(--color-muted)">
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(yMax * f)}
            y2={y(yMax * f)}
            stroke="var(--color-border)"
            strokeWidth={0.5}
          />
          <text x={PAD.left - 6} y={y(yMax * f)} textAnchor="end" dominantBaseline="central">
            {num.format(yMax * f)}
          </text>
        </g>
      ))}
      {xTicks.map(f => (
        <text
          key={`x${f}`}
          x={x(xMax * f)}
          y={H - PAD.bottom + 14}
          textAnchor="middle"
          fontSize={10}
          fill="var(--color-muted)"
        >
          {pct.format(xMax * f)}
        </text>
      ))}
      <text x={(PAD.left + W - PAD.right) / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--color-muted)">
        {xLabel}
      </text>
      <text
        transform={`translate(10 ${(PAD.top + H - PAD.bottom) / 2}) rotate(-90)`}
        textAnchor="middle"
        fontSize={10}
        fill="var(--color-muted)"
      >
        {yLabel}
      </text>
      {points.map(p => {
        const isActive = p.region === active
        return (
          <circle
            key={p.region}
            cx={x(p.share)}
            cy={y(p.hours)}
            r={isActive ? 7 : 5}
            fill={isActive ? 'var(--color-fg)' : 'var(--color-primary)'}
            fillOpacity={isActive ? 1 : 0.75}
            stroke="var(--color-bg)"
            strokeWidth={1}
            tabIndex={0}
            role="button"
            aria-label={describe(p)}
            className="cursor-pointer outline-none focus-visible:stroke-[var(--color-fg)]"
            onPointerEnter={() => onActive(p.region)}
            onPointerLeave={() => onActive(null)}
            onFocus={() => onActive(p.region)}
            onBlur={() => onActive(null)}
            onClick={() => onPick(p.region)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onPick(p.region)
              }
            }}
          >
            <title>{describe(p)}</title>
          </circle>
        )
      })}
    </svg>
  )
}
