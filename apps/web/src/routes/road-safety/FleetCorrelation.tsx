import { useState } from 'react'
import type { ReactNode } from 'react'
import type { RoadSafetyRegionsResponse } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { correlationStrength, fleetPoints, pearson } from '@/routes/road-safety/helpers'
import SegmentedTabs from '@/routes/road-safety/SegmentedTabs'

type Props = {
  regions: RoadSafetyRegionsResponse['regions']
}

const METRICS = ['deaths', 'crashes'] as const
type Metric = (typeof METRICS)[number]
const DEFAULT_METRIC: Metric = 'deaths'

const SIZE = { w: 560, h: 320, left: 48, right: 12, top: 12, bottom: 38 }
const TICKS = [0, 0.5, 1]

/** Scatter of registered cars (x) against deaths or crashes (y) per region, with Pearson r and the regions furthest off the trend. */
export default function FleetCorrelation({ regions }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [metric, setMetric] = useState<Metric>(DEFAULT_METRIC)
  const [active, setActive] = useState<string | null>(null)
  const locale = toIntlLocale(i18n.language)
  const int = new Intl.NumberFormat(locale)
  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })
  const one = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 })
  const two = new Intl.NumberFormat(locale, { maximumFractionDigits: 2, minimumFractionDigits: 2 })

  const points = fleetPoints(regions)
  if (points.length < 3) return null

  const r = pearson(
    points.map(p => p.fleet),
    points.map(p => p[metric])
  )
  const maxX = Math.max(...points.map(p => p.fleet))
  const maxY = Math.max(...points.map(p => p[metric]))
  const plotW = SIZE.w - SIZE.left - SIZE.right
  const plotH = SIZE.h - SIZE.top - SIZE.bottom
  const x = (v: number): number => SIZE.left + (v / maxX) * plotW
  const y = (v: number): number => SIZE.top + plotH - (v / maxY) * plotH
  const sorted = points.toSorted((a, b) => b.ratio - a.ratio)
  const extremes = points.length > 6 ? [...sorted.slice(0, 3), ...sorted.slice(-3)] : sorted
  const shown = active ? points.find(p => p.region === active) : null

  return (
    <Card className="mb-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{t('roadSafety.corr.title')}</h2>

        <SegmentedTabs
          values={METRICS}
          value={metric}
          onChange={setMetric}
          label={m => t(`roadSafety.corr.metric.${m}`)}
        />
      </div>

      <p className="mb-3 text-sm">
        {r === null
          ? t('roadSafety.corr.noR')
          : t('roadSafety.corr.summary', {
              r: two.format(r),
              strength: t(`roadSafety.corr.strength.${correlationStrength(r)}`)
            })}
      </p>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div>
          <svg
            viewBox={`0 0 ${SIZE.w} ${SIZE.h}`}
            role="img"
            aria-label={t('roadSafety.corr.title')}
            className="w-full text-[var(--color-muted)]"
          >
            {TICKS.map(f => (
              <g key={f}>
                <line
                  x1={SIZE.left}
                  x2={SIZE.w - SIZE.right}
                  y1={y(maxY * f)}
                  y2={y(maxY * f)}
                  stroke="currentColor"
                  strokeOpacity={0.2}
                />
                <text x={SIZE.left - 6} y={y(maxY * f) + 4} textAnchor="end" fontSize="11" fill="currentColor">
                  {compact.format(maxY * f)}
                </text>
                <text x={x(maxX * f)} y={SIZE.h - 20} textAnchor="middle" fontSize="11" fill="currentColor">
                  {compact.format(maxX * f)}
                </text>
              </g>
            ))}

            <text x={SIZE.left + plotW / 2} y={SIZE.h - 4} textAnchor="middle" fontSize="11" fill="currentColor">
              {t('roadSafety.corr.axisFleet')}
            </text>

            {points.map(p => (
              <circle
                key={p.region}
                cx={x(p.fleet)}
                cy={y(p[metric])}
                r={p.region === active ? 7 : 5}
                fill="var(--color-primary)"
                fillOpacity={active && p.region !== active ? 0.35 : 0.8}
                onMouseEnter={() => setActive(p.region)}
                onMouseLeave={() => setActive(null)}
              >
                <title>{p.region}</title>
              </circle>
            ))}
          </svg>

          <p className="min-h-5 text-xs text-[var(--color-muted)]" aria-live="polite">
            {shown
              ? t('roadSafety.corr.point', {
                  region: shown.region,
                  fleet: int.format(shown.fleet),
                  value: int.format(shown[metric])
                })
              : t('roadSafety.corr.hover')}
          </p>
        </div>

        <div>
          <h3 className="mb-1 text-sm font-semibold">{t('roadSafety.corr.ratioTitle')}</h3>
          <p className="mb-2 text-xs text-[var(--color-muted)]">{t('roadSafety.corr.ratioNote')}</p>

          <ol className="space-y-0.5 text-sm">
            {extremes.map(p => (
              <li
                key={p.region}
                className="flex justify-between gap-2"
                onMouseEnter={() => setActive(p.region)}
                onMouseLeave={() => setActive(null)}
              >
                <span className="truncate">{p.region}</span>
                <span className="tabular-nums">x{one.format(p.ratio)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <p className="mt-3 text-xs text-[var(--color-muted)]">{t('roadSafety.corr.caveat')}</p>
    </Card>
  )
}
