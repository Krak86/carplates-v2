import type { ReactNode } from 'react'
import type { WeightBoard } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import WeightModelList from '@/routes/stats/WeightModelList'

type Props = {
  board: WeightBoard
  /** Put each model's vehicle group in brackets — for the mixed "all" board. */
  showGroup?: boolean
}

/** The heaviest and lightest model cards side by side (top 5, expandable) — shared by the home screen and the /stats panel. */
export default function WeightModelsCards({ board, showGroup }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card>
        <WeightModelList title={t('stats.weight.heaviest')} models={board.heaviest} showGroup={showGroup} />
      </Card>
      <Card>
        <WeightModelList title={t('stats.weight.lightest')} models={board.lightest} showGroup={showGroup} />
      </Card>
    </div>
  )
}
