import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { AuctionLot, Currency, FxResponse } from '@carplates/shared'

import {
  convertUah,
  effectiveLotCurrency,
  formatCompactUah,
  formatLotMonth,
  formatPrice,
  lotKey,
  lotMonthOf,
  lotNumber,
  lotSource,
  priceSeries
} from '@/components/ua-auctions/helpers'
import { toIntlLocale } from '@/lib/intl'

type Props = {
  lots: readonly AuctionLot[]
  currency: Currency
  fx: FxResponse | null
}

const WIDTH = 320
const HEIGHT = 190
const PAD = { left: 46, right: 14, top: 14, bottom: 46 }
const GRID_LINES = 3
const SOLD_COLOR = '#16a34a'

/** `2026-10` -> `10.26` under a point. */
const axisMonth = (month: string | null): string => (month ? `${month.slice(5)}.${month.slice(2, 4)}` : '')

/**
 * Price dynamics of a car's lots, oldest to newest: the starting price of every lot (line + dots) and, where the lot
 * sold, the sale price (green dot). Lots of one proceeding are repeat rounds (dashed dividers, "R1, R2" under the
 * points). Points are spaced evenly: the feed gives only a month per lot, not a date. Shown from two priced lots.
 */
export default function UaAuctionChart({ lots, currency: wanted, fx }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const currency = effectiveLotCurrency(wanted, fx)
  const points = priceSeries(lots)
  if (points.length < 2) return null
  const hasProzorro = points.some(p => lotSource(p.lot) === 'prozorro')
  const hasSetam = points.some(p => lotSource(p.lot) === 'setam')

  const prices = points.flatMap(p => [p.lot.startPrice ?? 0, p.lot.salePrice ?? 0])
  const top = Math.max(...prices)
  const plotW = WIDTH - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const x = (i: number): number => PAD.left + (plotW * i) / (points.length - 1)
  const y = (v: number): number => PAD.top + plotH - (plotH * v) / top
  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.lot.startPrice ?? 0).toFixed(1)}`)
    .join(' ')
  const skip = points.length > 8 ? Math.ceil(points.length / 8) : 1
  const summary = points
    .map(
      p =>
        `${t(`uaAuctions.source.${lotSource(p.lot)}`)} ${formatLotMonth(lotMonthOf(p.lot), locale) ?? lotNumber(p.lot)}: ${formatPrice(p.lot.startPrice, currency, fx, locale)}${p.lot.sold ? ` -> ${formatPrice(p.lot.salePrice, currency, fx, locale)}` : ''}`
    )
    .join('; ')

  return (
    <figure className="mb-3">
      <figcaption className="mb-1 text-sm font-semibold">
        {t('uaAuctions.chart.title')}, {currency}
      </figcaption>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={summary} className="h-auto w-full max-w-md">
        {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
          const v = (top * i) / GRID_LINES
          return (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
              <text x={PAD.left - 6} y={y(v) + 3} textAnchor="end" fontSize={9} fill="var(--color-muted)">
                {formatCompactUah(convertUah(v, currency, fx), locale)}
              </text>
            </g>
          )
        })}

        {points.map((p, i) =>
          i > 0 && p.round !== null && p.round === 1 ? (
            <line
              key={`d${lotKey(p.lot)}`}
              x1={(x(i) + x(i - 1)) / 2}
              x2={(x(i) + x(i - 1)) / 2}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--color-border)"
              strokeDasharray="3 3"
            />
          ) : null
        )}

        <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinejoin="round" />

        {points.map((p, i) => (
          <g key={lotKey(p.lot)}>
            {lotSource(p.lot) === 'prozorro' ? (
              <rect
                x={x(i) - 4}
                y={y(p.lot.startPrice ?? 0) - 4}
                width={8}
                height={8}
                fill="var(--color-primary)"
                stroke="var(--color-surface)"
                strokeWidth={2}
              >
                <title>{`${t(`uaAuctions.source.${lotSource(p.lot)}`)}, ${formatLotMonth(lotMonthOf(p.lot), locale) ?? ''} #${lotNumber(p.lot)}: ${formatPrice(p.lot.startPrice, currency, fx, locale)}`}</title>
              </rect>
            ) : (
              <circle
                cx={x(i)}
                cy={y(p.lot.startPrice ?? 0)}
                r={4}
                fill="var(--color-primary)"
                stroke="var(--color-surface)"
                strokeWidth={2}
              >
                <title>{`${t(`uaAuctions.source.${lotSource(p.lot)}`)}, ${formatLotMonth(lotMonthOf(p.lot), locale) ?? ''} #${lotNumber(p.lot)}: ${formatPrice(p.lot.startPrice, currency, fx, locale)}`}</title>
              </circle>
            )}
            {p.lot.salePrice !== null && (
              <circle
                cx={x(i)}
                cy={y(p.lot.salePrice)}
                r={5}
                fill={SOLD_COLOR}
                stroke="var(--color-surface)"
                strokeWidth={2}
              >
                <title>{`${t('uaAuctions.chart.sale')}: ${formatPrice(p.lot.salePrice, currency, fx, locale)}`}</title>
              </circle>
            )}
            {i % skip === 0 && (
              <text x={x(i)} y={HEIGHT - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="var(--color-muted)">
                {axisMonth(lotMonthOf(p.lot))}
              </text>
            )}
            {i % skip === 0 && p.round !== null && (
              <text x={x(i)} y={HEIGHT - PAD.bottom + 26} textAnchor="middle" fontSize={9} fill="var(--color-muted)">
                {t('uaAuctions.chart.round', { n: p.round })}
              </text>
            )}
          </g>
        ))}
      </svg>

      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
          {t('uaAuctions.chart.start')}
          {hasSetam && hasProzorro && ` (${t('uaAuctions.source.setam')})`}
        </li>
        {hasSetam && hasProzorro && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2.5 w-2.5 bg-[var(--color-primary)]" />
            {t('uaAuctions.chart.start')} ({t('uaAuctions.source.prozorro')})
          </li>
        )}
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: SOLD_COLOR }} />
          {t('uaAuctions.chart.sale')}
        </li>
      </ul>

      <p className="mt-1 text-xs text-[var(--color-muted)]">{t('uaAuctions.chart.note')}</p>
    </figure>
  )
}
