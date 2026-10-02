import type { ReactNode } from 'react'
import type { FuelStatsResponse } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import FuelModelList from '@/routes/fuel/FuelModelList'

type Props = {
  stats: FuelStatsResponse
}

/** Cleanest / most CO₂-heavy model leaderboards (top 5, expandable) — shown on the homepage below the top stats. */
export default function FuelModelsPanel({ stats }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="mb-6 grid gap-3 md:grid-cols-2">
      <Card>
        <FuelModelList title={t('fuel.cleanest')} models={stats.cleanestModels} />
      </Card>
      <Card>
        <FuelModelList title={t('fuel.dirtiest')} models={stats.dirtiestModels} />
      </Card>
    </div>
  )
}
