import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { statsQuery } from '@/lib/queries'
import { rankOf, rankOfModel, topBrands, topColors, topModels, topRegions } from '@/routes/stats/helpers'

type Props = {
  brand: string | null
  model: string | null
  color: string | null
  region: string | null
}

/** `highlight`/`highlightModel` are read once by StatsRoute on arrival (see its state comment) to scroll to and flash this exact row. */
function statsLink(params: Record<string, string>): string {
  return `/stats?${new URLSearchParams(params).toString()}`
}

/**
 * Small "this car places in a top leaderboard" badges — reuses the same cached
 * `statsQuery()` the stats page fills (staleTime: Infinity, see lib/queries.ts), so this
 * is a cache hit whenever the Stats page has been visited, and otherwise a small
 * background fetch that never blocks the rest of the card. Renders nothing until that
 * resolves and nothing at all if the car doesn't place in any of the four leaderboards.
 * Each badge deep-links to the exact place on the stats page that shows it.
 */
export default function TopStatBadges({ brand, model, color, region }: Props): ReactNode {
  const { t } = useTranslation()
  const stats = useQuery(statsQuery())
  if (!stats.data) return null

  const badges = [
    {
      key: 'brand',
      icon: '🏭',
      rank: rankOf(topBrands(stats.data), brand),
      textKey: 'result.topBrand',
      to: statsLink({ dim: 'brand', highlight: brand ?? '' })
    },
    {
      key: 'model',
      icon: '🚗',
      rank: rankOfModel(topModels(stats.data), brand, model),
      textKey: 'result.topModel',
      // No interactive "model" dimension tab exists (see stats_by_model's migration) — this
      // lands on the always-visible top-models panel instead.
      to: statsLink({ highlightModel: `${brand ?? ''}::${model ?? ''}` })
    },
    {
      key: 'color',
      icon: '🎨',
      rank: rankOf(topColors(stats.data), color),
      textKey: 'result.topColor',
      to: statsLink({ dim: 'color', highlight: color ?? '' })
    },
    {
      key: 'region',
      icon: '🗺️',
      rank: rankOf(topRegions(stats.data), region),
      textKey: 'result.topRegion',
      to: statsLink({ dim: 'region', highlight: region ?? '' })
    }
  ].filter((b): b is typeof b & { rank: number } => b.rank !== null)

  if (badges.length === 0) return null

  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {badges.map(badge => (
        <Link
          key={badge.key}
          to={badge.to}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/20 px-2 py-0.5 text-xs text-[var(--color-fg)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          <span aria-hidden>{badge.icon}</span>
          {t(badge.textKey, { rank: badge.rank })}
        </Link>
      ))}
    </div>
  )
}
