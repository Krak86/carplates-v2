import type { ReactNode } from 'react'
import type { SafetyStatsResponse } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import SafetyModelList from '@/routes/safety/SafetyModelList'

type Props = {
  stats: SafetyStatsResponse
}

/** Safest / least safe model leaderboards by combined crash score (top 5, expandable) — shown on the homepage too. */
export default function SafetyModelsPanel({ stats }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="mb-6 grid gap-3 md:grid-cols-2">
      <Card>
        <SafetyModelList title={t('safety.safest')} models={stats.safestModels} />
      </Card>
      <Card>
        <SafetyModelList title={t('safety.leastSafe')} models={stats.leastSafeModels} />
      </Card>
    </div>
  )
}
