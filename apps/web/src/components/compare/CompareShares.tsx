import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { formatPercent } from '@/components/RdwSpecs.helpers'

import CompareSectionHeading from './CompareSectionHeading'
import type { ShareBar, ShareSide } from './shares'
import { SIDE_COLOR } from './visuals'

type Props = {
  bars: readonly ShareBar[]
  names: readonly [string, string]
}

/** Strength of each segment's tint, largest class first: the car keeps its colour, the rank sets the shade. */
const TINTS = [100, 72, 52, 38, 26] as const

const tint = (side: 0 | 1, rank: number): string =>
  `color-mix(in oklab, ${SIDE_COLOR[side]} ${TINTS[Math.min(rank, TINTS.length - 1)]}%, var(--color-surface))`

function Stack({ data, side, label }: { data: ShareSide; side: 0 | 1; label: (key: string) => string }): ReactNode {
  const { t } = useTranslation()
  const parts = [
    ...data.items.map(i => ({ id: i.key, name: label(i.key), share: i.share })),
    ...(data.other > 0 ? [{ id: '_other', name: t('compare.shares.other'), share: data.other }] : [])
  ]
  return (
    <>
      <div className="flex h-3 gap-0.5" aria-hidden>
        {parts.map((p, rank) => (
          <div
            key={p.id}
            className={rank === 0 ? 'rounded-l-sm' : rank === parts.length - 1 ? 'rounded-r-sm' : ''}
            style={{ width: `${p.share * 100}%`, background: tint(side, rank) }}
          />
        ))}
      </div>
      <p className="mt-1 text-sm">
        {parts.map((p, rank) => (
          <span key={p.id}>
            {rank > 0 && <span className="text-[var(--color-muted)]"> · </span>}
            {p.name} <span className="text-[var(--color-muted)]">{formatPercent(p.share)}</span>
          </span>
        ))}
      </p>
    </>
  )
}

/** Fuel mix, body types and colours of each car's model in the Dutch fleet, as stacked share bars. */
export default function CompareShares({ bars, names }: Props): ReactNode {
  const { t } = useTranslation()
  if (bars.length === 0) return null

  return (
    <section aria-labelledby="compare-shares">
      <CompareSectionHeading section="shares" title={t('compare.shares.title')} />
      <p className="mb-3 text-sm text-[var(--color-muted)]">{t('compare.shares.note')}</p>
      <div className="grid gap-5 md:grid-cols-3">
        {bars.map(bar => (
          <div key={bar.key} className="space-y-3">
            <h3 className="text-base font-semibold">{t(`rdw.${bar.key}`)}</h3>
            {([0, 1] as const).map(side => {
              const data = bar.sides[side]
              return (
                <div key={side} style={{ borderLeft: `3px solid ${SIDE_COLOR[side]}`, paddingLeft: 8 }}>
                  <div className="mb-1 text-sm font-semibold break-words">{names[side]}</div>
                  {data ? (
                    <Stack
                      data={data}
                      side={side}
                      label={key => t(`rdw.${bar.itemPrefix}.${key}`, { defaultValue: key })}
                    />
                  ) : (
                    <p className="text-sm text-[var(--color-muted)]">-</p>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
