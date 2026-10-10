import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import InfoPopover from '@/components/InfoPopover'
import { statsTopQuery } from '@/lib/queries'
import { rankingBadges } from '@/routes/stats/helpers'

type Props = {
  brand: string | null
  model: string | null
  color: string | null
  region: string | null
  /** Raw registry kind — weight ranks are within the vehicle's own group. */
  kind: string | null
}

// Full class names so Tailwind sees them; anything not listed (brand/model/colour/region) is a plain stats chip.
const TONE: Record<string, string> = {
  cleanest: 'chip-fuel',
  dirtiest: 'chip-fuel',
  safest: 'chip-safety',
  leastSafe: 'chip-safety',
  heaviest: 'chip-weight',
  lightest: 'chip-weight'
}
const DEFAULT_TONE = 'chip-stats'

/**
 * Small "this car places in a top leaderboard" chips — registry (make/model/colour/region), fuel/CO2
 * (cleanest/highest-CO2 model) and crash-test (safest/least-safe model) — all backed by one `statsTopQuery()`
 * (a few-KB payload, staleTime: Infinity, see lib/queries.ts — not the ~14 MB full stats),
 * a small background fetch that never blocks the rest of the card. Renders nothing until that
 * resolves and nothing at all if the car doesn't place in any leaderboard.
 * Each chip deep-links to the exact place on the stats / fuel / safety page that shows it.
 */
export default function TopStatBadges({ brand, model, color, region, kind }: Props): ReactNode {
  const { t } = useTranslation()
  const stats = useQuery(statsTopQuery())
  if (!stats.data) return null

  const badges = rankingBadges(stats.data, { brand, model, color, region, kind })
  if (badges.length === 0) return null

  return (
    // `contents`: the chips flow in the parent's wrapping row, alongside sibling chips (e.g. the 3D view).
    <div className="contents">
      {badges.map(badge => (
        <InfoPopover
          key={badge.key}
          label={t(badge.textKey, { rank: badge.rank })}
          title={t(badge.textKey, { rank: badge.rank })}
          anchor={
            <Link
              viewTransition
              to={badge.to}
              className={`${TONE[badge.key] ?? DEFAULT_TONE} inline-flex animate-chip-in items-center gap-1 rounded-full border chip-tone px-2 py-0.5 text-xs text-[var(--color-fg)] transition-colors hover:text-[var(--color-primary)]`}
            >
              <span aria-hidden>{badge.icon}</span>
              {t(badge.textKey, { rank: badge.rank })}
            </Link>
          }
        >
          {t(`chip.tip.${badge.key}`)}
        </InfoPopover>
      ))}
    </div>
  )
}
