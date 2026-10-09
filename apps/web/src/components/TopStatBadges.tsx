import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { statsTopQuery } from '@/lib/queries'
import { rankingBadges } from '@/routes/stats/helpers'

type Props = {
  brand: string | null
  model: string | null
  color: string | null
  region: string | null
}

/**
 * Small "this car places in a top leaderboard" chips — registry (make/model/colour/region), fuel/CO2
 * (cleanest/highest-CO2 model) and crash-test (safest/least-safe model) — all backed by one `statsTopQuery()`
 * (a few-KB payload, staleTime: Infinity, see lib/queries.ts — not the ~14 MB full stats),
 * a small background fetch that never blocks the rest of the card. Renders nothing until that
 * resolves and nothing at all if the car doesn't place in any leaderboard.
 * Each chip deep-links to the exact place on the stats / fuel / safety page that shows it.
 */
export default function TopStatBadges({ brand, model, color, region }: Props): ReactNode {
  const { t } = useTranslation()
  const stats = useQuery(statsTopQuery())
  if (!stats.data) return null

  const badges = rankingBadges(stats.data, { brand, model, color, region })
  if (badges.length === 0) return null

  return (
    // `contents`: the chips flow in the parent's wrapping row, alongside sibling chips (e.g. the 3D view).
    <div className="contents">
      {badges.map(badge => (
        <Link
          viewTransition
          key={badge.key}
          to={badge.to}
          className="inline-flex animate-chip-in items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/20 px-2 py-0.5 text-xs text-[var(--color-fg)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          <span aria-hidden>{badge.icon}</span>
          {t(badge.textKey, { rank: badge.rank })}
        </Link>
      ))}
    </div>
  )
}
