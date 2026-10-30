import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import CompareSectionHeading from './CompareSectionHeading'
import { toIntlLocale } from '@/lib/intl'
import { useRegionLabel } from '@/lib/region-label'

import { formatWithUnit } from './format'
import type { FormatContext } from './format'
import { MIN_RADAR_AXES } from './radar'
import type { Radar, RadarAxis } from './radar'
import { SIDE_COLOR } from './visuals'

type Props = {
  radars: readonly Radar[]
  names: readonly [string, string]
}

const W = 560
const H = 320
const CX = W / 2
const CY = H / 2
const R = 100
const RINGS = [0.25, 0.5, 0.75, 1] as const
const LABEL_CHARS = 15

/** Axis `i` of `n` at fraction `f` of the radius, the first one straight up. */
const point = (i: number, n: number, f: number): readonly [number, number] => {
  const angle = (i / n) * Math.PI * 2 - Math.PI / 2
  return [CX + Math.cos(angle) * R * f, CY + Math.sin(angle) * R * f]
}

/** At most two lines of about `LABEL_CHARS` characters, so a long Ukrainian label stays inside the drawing. */
function wrap(text: string): string[] {
  const lines: string[] = []
  for (const word of text.split(' ')) {
    const last = lines.at(-1)
    if (last !== undefined && last.length + word.length < LABEL_CHARS) lines[lines.length - 1] = `${last} ${word}`
    else lines.push(word)
  }
  return lines.length > 2 ? [lines[0] ?? '', lines.slice(1).join(' ')] : lines
}

const polygon = (axes: readonly RadarAxis[], side: 0 | 1): string =>
  axes.map((axis, i) => point(i, axes.length, Math.max(0.02, side === 0 ? axis.a : axis.b)).join(',')).join(' ')

function RadarChart({ radar, names, ctx }: { radar: Radar; names: Props['names']; ctx: FormatContext }): ReactNode {
  const { t } = useTranslation()
  const n = radar.axes.length

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t(`compare.radar.${radar.id}`)} className="h-auto w-full">
      {RINGS.map(f => (
        <polygon
          key={f}
          points={radar.axes.map((_, i) => point(i, n, f).join(',')).join(' ')}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={1}
          strokeOpacity={f === 1 ? 1 : 0.5}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {radar.axes.map((axis, i) => {
        const [x, y] = point(i, n, 1)
        const [lx, ly] = point(i, n, 1.14)
        const cos = (lx - CX) / R
        const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle'
        const lines = wrap(t(axis.row.labelKey))
        return (
          <g key={axis.row.id}>
            <line
              x1={CX}
              y1={CY}
              x2={x}
              y2={y}
              stroke="var(--color-border)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={lx}
              y={ly - (lines.length - 1) * 6}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={12}
              fill="var(--color-muted)"
            >
              {lines.map((line, k) => (
                <tspan key={k} x={lx} dy={k === 0 ? 0 : 13}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        )
      })}
      {([0, 1] as const).map(side => (
        <g key={side}>
          <polygon
            points={polygon(radar.axes, side)}
            fill={SIDE_COLOR[side]}
            fillOpacity={0.18}
            stroke={SIDE_COLOR[side]}
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {radar.axes.map((axis, i) => {
            const [x, y] = point(i, n, Math.max(0.02, side === 0 ? axis.a : axis.b))
            return (
              <circle
                key={axis.row.id}
                cx={x}
                cy={y}
                r={4}
                fill={SIDE_COLOR[side]}
                stroke="var(--color-surface)"
                strokeWidth={2}
              >
                <title>{`${names[side]}: ${t(axis.row.labelKey)} ${formatWithUnit(axis.row, side === 0 ? axis.rawA : axis.rawB, ctx)}`}</title>
              </circle>
            )
          })}
        </g>
      ))}
    </svg>
  )
}

/** One or two common axes are no polygon: plain bars on the same fixed scales. */
function RadarBarsFallback({ radar, ctx }: { radar: Radar; ctx: FormatContext }): ReactNode {
  const { t } = useTranslation()
  return (
    <ul className="space-y-3">
      {radar.axes.map(axis => (
        <li key={axis.row.id}>
          <div className="mb-0.5 text-sm text-[var(--color-muted)]">{t(axis.row.labelKey)}</div>
          {([0, 1] as const).map(side => (
            <div key={side} className="flex items-center gap-2 text-sm">
              <div className="h-2.5 flex-1 rounded-sm bg-[var(--color-border)]/40" aria-hidden>
                <div
                  className="h-full rounded-sm"
                  style={{
                    width: `${Math.max(0.02, side === 0 ? axis.a : axis.b) * 100}%`,
                    background: SIDE_COLOR[side]
                  }}
                />
              </div>
              <span className="w-24 shrink-0">{formatWithUnit(axis.row, side === 0 ? axis.rawA : axis.rawB, ctx)}</span>
            </div>
          ))}
        </li>
      ))}
    </ul>
  )
}

function RadarData({ radar, names, ctx }: { radar: Radar; names: Props['names']; ctx: FormatContext }): ReactNode {
  const { t } = useTranslation()
  return (
    <details className="mt-1 text-sm">
      <summary className="cursor-pointer text-[var(--color-primary)]">{t('compare.radar.data')}</summary>
      <table className="mt-1 w-full border-collapse">
        <caption className="sr-only">{t(`compare.radar.${radar.id}`)}</caption>
        <thead>
          <tr>
            <th scope="col" className="sr-only">
              {t('compare.column.measure')}
            </th>
            {names.map((name, side) => (
              <th
                key={side}
                scope="col"
                className="pl-2 text-left font-semibold"
                style={{ borderBottom: `3px solid ${SIDE_COLOR[side as 0 | 1]}` }}
              >
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {radar.axes.map(axis => (
            <tr key={axis.row.id} className="border-b border-[var(--color-border)]/50">
              <th scope="row" className="py-1 pr-2 text-left font-normal text-[var(--color-muted)]">
                {t(axis.row.labelKey)}
              </th>
              <td className="pl-2">{formatWithUnit(axis.row, axis.rawA, ctx)}</td>
              <td className="pl-2">{formatWithUnit(axis.row, axis.rawB, ctx)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

/** Up to four radars on fixed absolute scales; an axis exists only where both cars have a value. */
export default function CompareRadars({ radars, names }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const regionLabel = useRegionLabel()
  const ctx: FormatContext = { locale: toIntlLocale(i18n.language), lang: i18n.language, t, regionLabel }
  if (radars.length === 0) return null

  return (
    <section aria-labelledby="compare-radars">
      <CompareSectionHeading section="radars" title={t('compare.radar.title')} />
      <p className="mb-2 text-sm text-[var(--color-muted)]">{t('compare.radar.note', { count: MIN_RADAR_AXES })}</p>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label={t('compare.radar.legend')}>
        {names.map((name, side) => (
          <li key={side} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-4 rounded-sm"
              style={{ background: SIDE_COLOR[side as 0 | 1] }}
            />
            {name}
          </li>
        ))}
      </ul>

      <div className="grid gap-6 md:grid-cols-2">
        {radars.map(radar => (
          <figure key={radar.id}>
            <figcaption className="mb-1 text-base font-semibold">{t(`compare.radar.${radar.id}`)}</figcaption>
            {radar.mode === 'radar' ? (
              <RadarChart radar={radar} names={names} ctx={ctx} />
            ) : (
              <RadarBarsFallback radar={radar} ctx={ctx} />
            )}
            <RadarData radar={radar} names={names} ctx={ctx} />
          </figure>
        ))}
      </div>
    </section>
  )
}
