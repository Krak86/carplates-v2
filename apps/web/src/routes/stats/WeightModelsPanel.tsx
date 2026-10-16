import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DEFAULT_WEIGHT_GROUP, WEIGHT_GROUPS, type WeightGroup } from '@carplates/shared'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import SectionInfo from '@/components/SectionInfo'
import { cn } from '@/lib/cn'
import { statsTopQuery } from '@/lib/queries'
import WeightModelsCards from '@/routes/stats/WeightModelsCards'

/**
 * Heaviest / lightest models (top 5, expandable) with a vehicle-group tab row: "all" by default, then passenger, truck,
 * bus, motorcycle (incl. moped, quad, tricycles), trailer (incl. semi-trailer) and other. Read from the same small
 * `statsTopQuery()` payload as the result-card ranking chips; renders nothing until it loads or before the rollup is built.
 */
type Props = {
  /** One card per row (see `WeightModelsCards`). */
  stacked?: boolean
}

export default function WeightModelsPanel({ stacked = false }: Props): ReactNode {
  const { t } = useTranslation()
  // The tab lives in the URL (?weight=passenger) so every group has its own shareable link, like the stats dimension tabs.
  const [searchParams, setSearchParams] = useSearchParams()
  const param = searchParams.get('weight')
  const group: WeightGroup = WEIGHT_GROUPS.find(g => g === param) ?? DEFAULT_WEIGHT_GROUP

  const handleGroupChange = (next: WeightGroup): void => {
    setSearchParams(
      prev => {
        const params = new URLSearchParams(prev)
        params.set('weight', next)
        return params
      },
      { preventScrollReset: true }
    )
  }
  const { data } = useQuery(statsTopQuery())
  const boards = data?.weightBoards
  const rootRef = useRef<HTMLDivElement>(null)
  const hasBoards = !!boards && Object.keys(boards).length > 0
  // Arriving on a ?weight= deep link (a result-card chip): bring the panel into view once it has rendered.
  const [deepLinked] = useState(() => searchParams.has('weight'))
  useEffect(() => {
    if (deepLinked && hasBoards) rootRef.current?.scrollIntoView({ block: 'start' })
  }, [deepLinked, hasBoards])
  if (!boards || Object.keys(boards).length === 0) return null

  // A group with no ranked model (e.g. "other") has no tab to open.
  const groups = WEIGHT_GROUPS.filter(g => (boards[g]?.heaviest.length ?? 0) > 0)
  const board = boards[group]

  return (
    <div ref={rootRef} className="mb-6 scroll-mt-4">
      <div role="group" aria-label={t('stats.weight.group')} className="mb-3 flex flex-wrap items-center gap-1.5">
        {groups.map(g => (
          <button
            key={g}
            type="button"
            aria-pressed={g === group}
            onClick={() => handleGroupChange(g)}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-xs',
              g === group ? 'border-primary bg-primary text-white' : 'border-border text-fg'
            )}
          >
            {t(`stats.weight.group.${g}`)}
          </button>
        ))}

        <SectionInfo section="statsWeight" title={t('stats.weight.title')} />
      </div>

      {board && <WeightModelsCards key={group} board={board} showGroup={group === 'all'} stacked={stacked} />}
    </div>
  )
}
