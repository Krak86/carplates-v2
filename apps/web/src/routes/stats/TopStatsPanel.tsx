import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { StatsResponse } from '@carplates/shared'

import BrandLogo from '@/components/BrandLogo'
import Card from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { scrollElementIntoView } from '@/lib/share-section'
import { MAX_TOP_N, topBrands, topColors, topModels, topRegions } from '@/routes/stats/helpers'

type Props = {
  stats: StatsResponse
  /** A ResultCard badge deep link landed here for this brand+model — scroll to it, expanding if needed, and flash it. */
  highlightModel?: { brand: string; model: string } | null
}

type LeaderboardEntry = {
  key: string
  /** A brand logo, when the entry has one — kept separate from `label` so it sits in its own fixed-width slot. */
  brand?: string
  label: string
  count: number
  highlighted?: boolean
}

// Collapsed default — matches the original "top 5" panel; "Show top 10" reveals the rest of
// what the API already sent (MAX_TOP_N, see helpers.ts) without another round trip.
const DEFAULT_VISIBLE_N = 5
const HIGHLIGHT_DURATION_MS = 2500

function Leaderboard({
  titleKey,
  icon,
  entries
}: {
  titleKey: string
  icon: string
  entries: LeaderboardEntry[]
}): ReactNode {
  const { t, i18n } = useTranslation()
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const hasHighlighted = entries.some(e => e.highlighted)
  // Lazy init, same idiom as ResultCard's `isSharedHistory` deep link — a highlighted entry
  // (which may be past the default 5) must already be expanded into view before it can be
  // scrolled to, not expanded later from an effect.
  const [expanded, setExpanded] = useState(() => hasHighlighted)
  const [flashing, setFlashing] = useState(() => hasHighlighted)
  const highlightRef = useRef<HTMLLIElement>(null)
  const canExpand = entries.length > DEFAULT_VISIBLE_N
  const visible = entries.slice(0, expanded ? MAX_TOP_N : DEFAULT_VISIBLE_N)

  useEffect(() => {
    if (hasHighlighted && highlightRef.current) scrollElementIntoView(highlightRef.current)
  }, [hasHighlighted])

  useEffect(() => {
    if (!flashing) return
    const timer = setTimeout(() => setFlashing(false), HIGHLIGHT_DURATION_MS)
    return (): void => clearTimeout(timer)
  }, [flashing])

  return (
    <Card>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)] uppercase">
        <span aria-hidden>{icon}</span> {t(titleKey, { count: visible.length })}
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">{t('stats.noRows')}</p>
      ) : (
        <ol className="space-y-1">
          {visible.map((entry, index) => (
            <li
              key={entry.key}
              ref={entry.highlighted ? highlightRef : undefined}
              className={cn(
                'flex items-center justify-between gap-2 rounded text-sm transition-colors duration-1000',
                entry.highlighted && flashing && 'bg-[var(--color-primary)]/20'
              )}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="w-4 shrink-0 text-[var(--color-muted)]">{index + 1}.</span>
                {entry.brand !== undefined && (
                  <span className="flex h-4 w-5 shrink-0 items-center justify-center">
                    <BrandLogo brand={entry.brand} size="sm" />
                  </span>
                )}
                {/* title: native tooltip with the untruncated text — same pattern as the dep/kind hints elsewhere. */}
                <span className="truncate font-medium" title={entry.label}>
                  {entry.label}
                </span>
              </span>
              <span className="shrink-0 text-[var(--color-muted)]">{numberFormat.format(entry.count)}</span>
            </li>
          ))}
        </ol>
      )}
      {canExpand && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-2 text-xs text-[var(--color-primary)] hover:underline"
        >
          {expanded ? t('stats.top.showLess') : t('stats.top.showMore')}
        </button>
      )}
    </Card>
  )
}

/**
 * Brief "top 5" (expandable to top 10) leaderboards shown above the interactive stats
 * table/filters — a fixed glance at the fleet (ranked by distinctPlates, not the table's
 * selectable metric), not another filterable view. Reused as-is by ResultCard to badge a car
 * that places in one.
 */
export default function TopStatsPanel({ stats, highlightModel }: Props): ReactNode {
  const brandEntries: LeaderboardEntry[] = topBrands(stats).map(brand => {
    const row = stats.byBrand.find(r => r.value === brand)
    return { key: brand, brand, label: brand, count: row?.distinctPlates ?? 0 }
  })

  const modelEntries: LeaderboardEntry[] = topModels(stats).map(row => ({
    key: `${row.brand}-${row.model}`,
    brand: row.brand,
    label: `${row.brand} ${row.model}`,
    count: row.distinctPlates,
    highlighted: row.brand === highlightModel?.brand && row.model === highlightModel?.model
  }))

  const colorEntries: LeaderboardEntry[] = topColors(stats).map(color => {
    const row = stats.byColor.find(r => r.value === color)
    return { key: color, label: color, count: row?.distinctPlates ?? 0 }
  })

  const regionEntries: LeaderboardEntry[] = topRegions(stats).map(region => {
    const row = stats.byRegion.find(r => r.region === region)
    return { key: region, label: region, count: row?.distinctPlates ?? 0 }
  })

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Leaderboard titleKey="stats.top.brand" icon="🏭" entries={brandEntries} />
      <Leaderboard titleKey="stats.top.model" icon="🚗" entries={modelEntries} />
      <Leaderboard titleKey="stats.top.color" icon="🎨" entries={colorEntries} />
      <Leaderboard titleKey="stats.top.region" icon="🗺️" entries={regionEntries} />
    </div>
  )
}
