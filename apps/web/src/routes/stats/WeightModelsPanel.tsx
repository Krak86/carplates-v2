import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DEFAULT_WEIGHT_GROUP, WEIGHT_GROUPS, type WeightGroup } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'
import { statsTopQuery } from '@/lib/queries'
import WeightModelsCards from '@/routes/stats/WeightModelsCards'

/**
 * Heaviest / lightest models (top 5, expandable) with a vehicle-group tab row: "all" by default, then passenger, truck,
 * bus, motorcycle (incl. moped, quad, tricycles), trailer (incl. semi-trailer) and other. Read from the same small
 * `statsTopQuery()` payload as the result-card ranking chips; renders nothing until it loads or before the rollup is built.
 */
export default function WeightModelsPanel(): ReactNode {
  const { t } = useTranslation()
  const [group, setGroup] = useState<WeightGroup>(DEFAULT_WEIGHT_GROUP)
  const { data } = useQuery(statsTopQuery())
  const boards = data?.weightBoards
  if (!boards || Object.keys(boards).length === 0) return null

  // A group with no ranked model (e.g. "other") has no tab to open.
  const groups = WEIGHT_GROUPS.filter(g => (boards[g]?.heaviest.length ?? 0) > 0)
  const board = boards[group]

  return (
    <div className="mb-6">
      <div role="group" aria-label={t('stats.weight.group')} className="mb-3 flex flex-wrap gap-1.5">
        {groups.map(g => (
          <button
            key={g}
            type="button"
            aria-pressed={g === group}
            onClick={() => setGroup(g)}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-xs',
              g === group ? 'border-primary bg-primary text-white' : 'border-border text-fg'
            )}
          >
            {t(`stats.weight.group.${g}`)}
          </button>
        ))}
      </div>

      {board && <WeightModelsCards key={group} board={board} showGroup={group === 'all'} />}
    </div>
  )
}
