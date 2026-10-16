import type { ReactNode } from 'react'
import type { WeightBoard } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'
import Card from '@/components/ui/Card'
import WeightModelList from '@/routes/stats/WeightModelList'

type Props = {
  board: WeightBoard
  /** Put each model's vehicle group in brackets — for the mixed "all" board. */
  showGroup?: boolean
  /** One card per row at every width (for narrow containers, e.g. inside an article card). */
  stacked?: boolean
}

/** The heaviest and lightest model cards side by side (top 5, expandable) — shared by the home screen and the /stats panel. */
export default function WeightModelsCards({ board, showGroup, stacked = false }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div className={cn('grid gap-3', !stacked && 'md:grid-cols-2')}>
      <Card>
        <WeightModelList title={t('stats.weight.heaviest')} models={board.heaviest} showGroup={showGroup} />
      </Card>
      <Card>
        <WeightModelList title={t('stats.weight.lightest')} models={board.lightest} showGroup={showGroup} />
      </Card>
    </div>
  )
}
