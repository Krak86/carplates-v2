import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { toIntlLocale } from '@/lib/intl'

import CompareSectionHeading from './CompareSectionHeading'
import type { CurveSet, Gantt } from './extras'
import { SIDE_COLOR } from './visuals'

type Names = readonly [string, string]

const BOX = { width: 360, height: 190, left: 44, right: 10, top: 12, bottom: 28 }

function Curve({
  title,
  curves,
  names,
  yLabel,
  xLabel
}: {
  title: string
  curves: CurveSet
  names: Names
  yLabel: (v: number) => string
  xLabel: (v: number) => string
}): ReactNode {
  const { t } = useTranslation()
  const w = BOX.width - BOX.left - BOX.right
  const h = BOX.height - BOX.top - BOX.bottom
  const span = curves.xMax - curves.xMin || 1
  const px = (x: number): number => BOX.left + ((x - curves.xMin) / span) * w
  const py = (y: number): number => BOX.top + h - (y / (curves.yMax || 1)) * h
  const alt = `${title}: ${names.map((n, i) => `${n} (${curves.series[i]?.length || '-'})`).join(', ')}`

  return (
    <figure className="m-0">
      <figcaption className="mb-1 text-center text-sm text-[var(--color-muted)]">{title}</figcaption>
      <svg viewBox={`0 0 ${BOX.width} ${BOX.height}`} role="img" aria-label={alt} className="h-auto w-full">
        <line x1={BOX.left} x2={BOX.left} y1={BOX.top} y2={BOX.top + h} stroke="var(--color-border)" />
        <line x1={BOX.left} x2={BOX.left + w} y1={BOX.top + h} y2={BOX.top + h} stroke="var(--color-border)" />
        <text x={BOX.left - 4} y={BOX.top + 8} textAnchor="end" fontSize="10" fill="var(--color-muted)">
          {yLabel(curves.yMax)}
        </text>
        <text x={BOX.left - 4} y={BOX.top + h} textAnchor="end" fontSize="10" fill="var(--color-muted)">
          0
        </text>
        <text x={BOX.left} y={BOX.height - 8} fontSize="10" fill="var(--color-muted)">
          {xLabel(curves.xMin)}
        </text>
        <text x={BOX.left + w} y={BOX.height - 8} textAnchor="end" fontSize="10" fill="var(--color-muted)">
          {xLabel(curves.xMax)}
        </text>
        {([0, 1] as const).map(side => {
          const points = curves.series[side]
          if (points.length === 0) return null
          return (
            <g key={side}>
              <path
                d={points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.x).toFixed(1)} ${py(p.y).toFixed(1)}`).join('')}
                fill="none"
                stroke={SIDE_COLOR[side]}
                strokeWidth="2"
                strokeDasharray={side === 1 ? '5 3' : undefined}
              />
              {points.map(p => (
                <circle key={p.x} cx={px(p.x)} cy={py(p.y)} r="2.5" fill={SIDE_COLOR[side]} />
              ))}
            </g>
          )
        })}
      </svg>
      <details className="mt-1 text-sm">
        <summary className="cursor-pointer text-[var(--color-muted)]">{t('compare.radar.data')}</summary>
        {([0, 1] as const).map(side => (
          <p key={side} className="mt-1" style={{ borderLeft: `3px solid ${SIDE_COLOR[side]}`, paddingLeft: 8 }}>
            <strong>{names[side]}</strong>:{' '}
            {curves.series[side].length === 0
              ? '-'
              : curves.series[side].map(p => `${xLabel(p.x)} ${yLabel(p.y)}`).join(' · ')}
          </p>
        ))}
      </details>
    </figure>
  )
}

/** Dutch new price by model year and the MOT fail rate by mileage, one line per car. */
export function Curves({
  price,
  mot,
  names
}: {
  price: CurveSet | null
  mot: CurveSet | null
  names: Names
}): ReactNode {
  const { t, i18n } = useTranslation()
  if (!price && !mot) return null
  const locale = toIntlLocale(i18n.language)

  return (
    <section aria-labelledby="compare-curves">
      <CompareSectionHeading section="curves" title={t('compare.curves.title')} />
      <p className="mb-3 text-sm text-[var(--color-muted)]">{t('compare.curves.note')}</p>
      <div className="grid gap-6 md:grid-cols-2">
        {price && (
          <Curve
            title={t('compare.curves.price')}
            curves={price}
            names={names}
            yLabel={v => `€${Math.round(v).toLocaleString(locale)}`}
            xLabel={v => String(v)}
          />
        )}
        {mot && (
          <Curve
            title={t('compare.curves.mot')}
            curves={mot}
            names={names}
            yLabel={v => `${Math.round(v)}%`}
            xLabel={v => `${v}k ${t('compare.curves.km')}`}
          />
        )}
      </div>
    </section>
  )
}

const GANTT_ROW = 18

/** Production years of every generation of both models on one axis; the car's own generation is outlined. */
export function GenerationGantt({ gantt, names }: { gantt: Gantt | null; names: Names }): ReactNode {
  const { t } = useTranslation()
  if (!gantt) return null
  const width = 360
  const left = 6
  const span = gantt.to - gantt.from + 1
  const x = (year: number): number => left + ((year - gantt.from) / span) * (width - left - 6)
  const rows = ([0, 1] as const).flatMap(side => gantt.bars.filter(b => b.side === side))
  const height = rows.length * GANTT_ROW + 22

  return (
    <section aria-labelledby="compare-timeline">
      <CompareSectionHeading section="timeline" title={t('compare.timeline.title')} />
      <p className="mb-2 text-sm text-[var(--color-muted)]">{t('compare.timeline.note')}</p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t('compare.timeline.alt', { a: names[0], b: names[1] })}
        className="h-auto w-full"
      >
        {rows.map((bar, i) => {
          const y = i * GANTT_ROW + 2
          const x1 = x(bar.yearFrom)
          const bw = Math.max(x(bar.yearTo + 1) - x1, 4)
          return (
            <g key={`${bar.side}-${bar.label}-${bar.yearFrom}`}>
              <rect
                x={x1}
                y={y}
                width={bw}
                height={GANTT_ROW - 5}
                rx="3"
                fill={SIDE_COLOR[bar.side]}
                fillOpacity={bar.current ? 1 : 0.35}
                stroke={bar.current ? 'var(--color-fg)' : 'none'}
                strokeWidth="1.5"
              />
              <text x={x1 + 4} y={y + 9} fontSize="9" fill="var(--color-fg)">
                {bar.label} {bar.yearFrom}-{bar.ongoing ? '' : bar.yearTo}
              </text>
            </g>
          )
        })}
        <text x={left} y={height - 4} fontSize="10" fill="var(--color-muted)">
          {gantt.from}
        </text>
        <text x={width - 6} y={height - 4} textAnchor="end" fontSize="10" fill="var(--color-muted)">
          {gantt.to}
        </text>
      </svg>
      <p className="text-sm">
        {([0, 1] as const).map(side => (
          <span key={side} className="mr-4" style={{ borderLeft: `3px solid ${SIDE_COLOR[side]}`, paddingLeft: 6 }}>
            {names[side]}
          </span>
        ))}
      </p>
    </section>
  )
}
