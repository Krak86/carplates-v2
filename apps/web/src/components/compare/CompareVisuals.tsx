import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { toIntlLocale } from '@/lib/intl'
import { useRegionLabel } from '@/lib/region-label'

import { GAP, formatWithUnit } from './format'
import type { FormatContext } from './format'
import CompareRadars from './CompareRadars'
import CompareSectionHeading from './CompareSectionHeading'
import CompareShares from './CompareShares'
import CompareSize from './CompareSize'
import { buildRadars, sameKind } from './radar'
import { sizeOf } from './rows'
import type { CompareSection } from './rows'
import { buildShareBars } from './shares'
import type { CompareLoaded } from './types'
import { MAX_HIGHLIGHTS, SIDE_COLOR, buildBars, buildHighlights } from './visuals'

type Props = {
  sections: readonly CompareSection[]
  /** Short names of car A and car B. */
  names: readonly [string, string]
}

function Highlights({ sections, names }: Props): ReactNode {
  const { t } = useTranslation()
  const all = buildHighlights(
    sections.flatMap(s => s.rows),
    Number.POSITIVE_INFINITY
  )
  if (all.length === 0) return null

  return (
    <section aria-labelledby="compare-highlights">
      <CompareSectionHeading section="highlights" title={t('compare.highlights.title')} />
      <div className="grid gap-4 md:grid-cols-2">
        {([0, 1] as const).map(side => {
          const items = all.filter(h => h.side === side).slice(0, MAX_HIGHLIGHTS)
          return (
            <div key={side} style={{ borderLeft: `3px solid ${SIDE_COLOR[side]}`, paddingLeft: 8 }}>
              <h3 className="sr-only">{names[side]}</h3>
              {items.length === 0 ? (
                <p className="text-base text-[var(--color-muted)]">{GAP}</p>
              ) : (
                <ul className="space-y-1.5 text-base">
                  {items.map(h => (
                    <li key={h.row.id}>
                      {t('compare.highlights.item', { label: t(h.row.labelKey), percent: h.percent })}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Bars({ sections, names }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const regionLabel = useRegionLabel()
  const ctx: FormatContext = { locale: toIntlLocale(i18n.language), lang: i18n.language, t, regionLabel }
  const bars = buildBars(sections.flatMap(s => s.rows))
  if (bars.length === 0) return null

  return (
    <section aria-labelledby="compare-bars">
      <CompareSectionHeading section="bars" title={t('compare.bars.title')} />
      <p className="mb-3 text-sm text-[var(--color-muted)]">{t('compare.bars.note')}</p>
      <div className="mb-2 grid grid-cols-[1fr_4.5rem_1fr] gap-2 text-sm font-semibold">
        <span className="text-right break-words">{names[0]}</span>
        <span aria-hidden />
        <span className="break-words">{names[1]}</span>
      </div>
      <ul className="space-y-3">
        {bars.map(bar => (
          <li key={bar.row.id}>
            <div className="mb-0.5 text-center text-sm text-[var(--color-muted)]">{t(bar.row.labelKey)}</div>
            <div className="grid grid-cols-[1fr_4.5rem_1fr] items-center gap-2">
              <div className="text-right">
                <div className="text-sm">{formatWithUnit(bar.row, bar.a, ctx)}</div>
                <div className="flex justify-end" aria-hidden>
                  <div
                    className="h-2.5 rounded-l-sm"
                    style={{ width: `${bar.widthA * 100}%`, background: SIDE_COLOR[0] }}
                  />
                </div>
              </div>

              <div className="text-center text-sm text-[var(--color-muted)]">
                {bar.larger === null ? (
                  '='
                ) : (
                  <>
                    <span aria-hidden>{bar.larger === 0 ? '◀ ' : ''}</span>
                    {`+${bar.percent}%`}
                    <span aria-hidden>{bar.larger === 1 ? ' ▶' : ''}</span>
                    <span className="sr-only">{t('compare.bars.larger', { name: names[bar.larger] })}</span>
                  </>
                )}
              </div>

              <div>
                <div className="text-sm">{formatWithUnit(bar.row, bar.b, ctx)}</div>
                <div aria-hidden>
                  <div
                    className="h-2.5 rounded-r-sm"
                    style={{ width: `${bar.widthB * 100}%`, background: SIDE_COLOR[1] }}
                  />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

type VisualsProps = Props & {
  /** What each car's queries returned: the share bars and the size overlay read from it, not from the rows. */
  loaded: readonly [CompareLoaded, CompareLoaded]
}

/** The visual layer above the table: sentences, radars, mirrored bars, share bars and the size overlay. */
export default function CompareVisuals({ sections, names, loaded }: VisualsProps): ReactNode {
  const { t } = useTranslation()
  if (sections.every(s => s.pending || s.rows.length === 0)) return null
  const rows = sections.flatMap(s => s.rows)
  const kindsMatch = sameKind(loaded[0].car?.kind, loaded[1].car?.kind)
  const radars = kindsMatch ? buildRadars(rows) : []

  return (
    <div className="space-y-8">
      <Highlights sections={sections} names={names} />
      <Bars sections={sections} names={names} />
      <CompareShares bars={buildShareBars(loaded[0], loaded[1])} names={names} />
      <CompareSize sizes={[sizeOf(loaded[0]), sizeOf(loaded[1])]} names={names} />
      {kindsMatch ? (
        <CompareRadars radars={radars} names={names} />
      ) : (
        <p role="status" className="text-base text-[var(--color-muted)]">
          {t('compare.radar.kindMismatch')}
        </p>
      )}
    </div>
  )
}
