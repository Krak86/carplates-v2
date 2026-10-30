import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { CO2_BAND_COLOR } from '@/components/CO2Badge.helpers'
import { toIntlLocale } from '@/lib/intl'

import CompareSectionHeading from './CompareSectionHeading'
import { CO2_SCALE_LIMITS, axisPosition } from './extras'
import type { Co2Marks, Dumbbell, FitRow, StarRow } from './extras'
import { SIDE_COLOR } from './visuals'

type Names = readonly [string, string]

const CO2_BANDS = ['green', 'yellow', 'orange', 'red'] as const
const FIT_ICON = { comfortable: '✅', tight: '⚠️', no: '⛔' } as const

/** min - median - max of the RDW measures both cars have, each pair on one shared axis. */
export function Dumbbells({ items, names }: { items: readonly Dumbbell[]; names: Names }): ReactNode {
  const { t, i18n } = useTranslation()
  if (items.length === 0) return null
  const locale = toIntlLocale(i18n.language)
  const num = (d: Dumbbell, v: number): string =>
    v.toLocaleString(locale, { minimumFractionDigits: d.decimals, maximumFractionDigits: d.decimals })

  return (
    <section aria-labelledby="compare-ranges">
      <CompareSectionHeading section="ranges" title={t('compare.ranges.title')} />
      <p className="mb-3 text-sm text-[var(--color-muted)]">{t('compare.ranges.note')}</p>
      <p className="mb-3 text-sm font-semibold" aria-hidden>
        {names.map((name, side) => (
          <span key={side} className="mr-4">
            <span style={{ color: SIDE_COLOR[side as 0 | 1] }}>{side === 0 ? '▼' : '▲'}</span> {name}
          </span>
        ))}
      </p>
      <ul>
        {items.map(d => (
          <li key={d.key} className="border-b border-[var(--color-border)]/50 py-3 first:pt-0 last:border-b-0">
            <div className="text-center text-sm text-[var(--color-muted)]">
              {t(d.labelKey)}
              {d.smallSample && (
                <span role="img" aria-label={t('compare.smallSample')} title={t('compare.smallSample')}>
                  {' '}
                  ⚠️
                </span>
              )}
            </div>
            {/* One track per measure like the CO2 scale: car 1 above the middle (▼), car 2 below (▲). */}
            <div className="relative pt-5 pb-5" aria-hidden>
              <div className="relative h-3 rounded-full bg-[var(--color-border)]/60">
                {([0, 1] as const).map(side => {
                  const r = d.ranges[side]
                  return (
                    <div
                      key={side}
                      className={`absolute h-1.5 rounded-full ${side === 0 ? 'top-0' : 'bottom-0'}`}
                      style={{
                        minWidth: 4,
                        left: `${axisPosition(d, r.min) * 100}%`,
                        width: `${(axisPosition(d, r.max) - axisPosition(d, r.min)) * 100}%`,
                        background: SIDE_COLOR[side]
                      }}
                    />
                  )
                })}
              </div>
              {([0, 1] as const).map(side => (
                <div
                  key={side}
                  className={`absolute -translate-x-1/2 text-xs ${side === 0 ? 'top-0' : 'bottom-0'}`}
                  style={{ left: `${axisPosition(d, d.ranges[side].median) * 100}%`, color: SIDE_COLOR[side] }}
                >
                  {side === 0 ? '▼' : '▲'}
                </div>
              ))}
            </div>
            <div className="space-y-0.5 text-sm">
              {([0, 1] as const).map(side => {
                const r = d.ranges[side]
                const unit = d.unitKey ? ` ${t(d.unitKey)}` : ''
                return (
                  <div key={side}>
                    <span aria-hidden style={{ color: SIDE_COLOR[side] }}>
                      {side === 0 ? '▼' : '▲'}{' '}
                    </span>
                    <span className="sr-only">{names[side]}: </span>
                    {num(d, r.min)} · <strong>{num(d, r.median)}</strong> · {num(d, r.max)}
                    {unit}
                  </div>
                )
              })}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Both cars' CO2 on the green / yellow / orange / red scale of the result card, and their star scores. */
export function SafetyAndCo2({
  stars,
  co2,
  names
}: {
  stars: readonly StarRow[]
  co2: Co2Marks | null
  names: Names
}): ReactNode {
  const { t, i18n } = useTranslation()
  if (stars.length === 0 && !co2) return null
  const locale = toIntlLocale(i18n.language)
  const starText = (value: number | null): string => {
    if (value === null) return '-'
    const full = Math.round(value)
    return `${'★'.repeat(full)}${'☆'.repeat(5 - full)} ${value.toLocaleString(locale, { maximumFractionDigits: 1 })}`
  }

  return (
    <section aria-labelledby="compare-safety">
      <CompareSectionHeading section="safety" title={t('compare.safety.title')} />
      {stars.length > 0 && (
        <dl className="mb-4 grid gap-x-4 gap-y-1 text-base md:grid-cols-[auto_1fr_1fr]">
          {stars.map(row => (
            <div key={row.id} className="contents">
              <dt className="text-[var(--color-muted)]">{t(`compare.safety.${row.id}`)}</dt>
              {([0, 1] as const).map(side => (
                <dd key={side} className="m-0" style={{ borderLeft: `3px solid ${SIDE_COLOR[side]}`, paddingLeft: 8 }}>
                  <span className="sr-only">{names[side]}: </span>
                  {starText(row.stars[side])}
                </dd>
              ))}
            </div>
          ))}
        </dl>
      )}
      {co2 && (
        <div>
          <div className="mb-1 text-sm text-[var(--color-muted)]">{t('compare.co2.title')}</div>
          <div className="relative pt-5 pb-5" aria-hidden>
            <div className="flex h-3 overflow-hidden rounded-full">
              {CO2_BANDS.map((band, i) => {
                const from = i === 0 ? 0 : (CO2_SCALE_LIMITS[i - 1] ?? 0)
                const to = CO2_SCALE_LIMITS[i] ?? co2.max
                return (
                  <div
                    key={band}
                    style={{ width: `${((to - from) / co2.max) * 100}%`, background: CO2_BAND_COLOR[band] }}
                  />
                )
              })}
            </div>
            {([0, 1] as const).map(side => {
              const v = co2.values[side]
              if (v === null) return null
              return (
                <div
                  key={side}
                  className={`absolute -translate-x-1/2 text-xs ${side === 0 ? 'top-0' : 'bottom-0'}`}
                  style={{ left: `${(Math.min(v, co2.max) / co2.max) * 100}%`, color: SIDE_COLOR[side] }}
                >
                  {side === 0 ? '▼' : '▲'}
                </div>
              )
            })}
          </div>
          <p className="text-sm">
            {([0, 1] as const).map(side => (
              <span key={side} className="mr-4">
                <span style={{ color: SIDE_COLOR[side] }}>{side === 0 ? '▼' : '▲'}</span> {names[side]}:{' '}
                {co2.values[side] === null ? '-' : `${Math.round(co2.values[side])} ${t('rdw.unitCo2')}`}
              </span>
            ))}
          </p>
        </div>
      )}
    </section>
  )
}

/** Does each car fit the reference places: the verdicts of "Size & parking", side by side. */
export function FitVerdicts({ rows, names }: { rows: readonly FitRow[]; names: Names }): ReactNode {
  const { t } = useTranslation()
  if (rows.length === 0) return null

  return (
    <section aria-labelledby="compare-fit">
      <CompareSectionHeading section="fit" title={t('compare.fit.title')} />
      <p className="mb-2 text-sm text-[var(--color-muted)]">{t('compare.fit.note')}</p>
      <table className="w-full table-fixed border-collapse text-base">
        <caption className="sr-only">{t('compare.fit.title')}</caption>
        <thead>
          <tr>
            <th scope="col" className="sr-only">
              {t('compare.column.measure')}
            </th>
            {names.map((name, side) => (
              <th
                key={side}
                scope="col"
                className="pb-1 pl-2 text-left font-semibold break-words"
                style={{ borderBottom: `3px solid ${SIDE_COLOR[side as 0 | 1]}` }}
              >
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={`${row.kind}-${row.id}`} className="border-b border-[var(--color-border)]/50">
              <th scope="row" className="py-1.5 pr-2 text-left font-normal text-[var(--color-muted)]">
                {t(`size.${row.kind === 'bay' ? 'bay' : 'garage'}.${row.id}`)}
              </th>
              {([0, 1] as const).map(side => {
                const v = row.verdicts[side]
                return (
                  <td key={side} className="py-1.5 pl-2">
                    {v ? (
                      <>
                        <span aria-hidden>{FIT_ICON[v]} </span>
                        {t(`size.verdict.${v}`)}
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
