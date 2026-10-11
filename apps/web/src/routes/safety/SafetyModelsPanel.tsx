import type { ReactNode } from 'react'
import type { SafetyStatsResponse } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import SectionInfo from '@/components/SectionInfo'
import Card from '@/components/ui/Card'
import SafetyModelList from '@/routes/safety/SafetyModelList'

type Props = {
  stats: SafetyStatsResponse
}

/** Safest / least safe model leaderboards by combined crash score (top 5, expandable) — shown on the homepage too. */
export default function SafetyModelsPanel({ stats }: Props): ReactNode {
  const { t } = useTranslation()
  const info = <SectionInfo section="safetyModels" title={t('safety.models.title')} />

  return (
    <div className="mb-6 grid gap-3 md:grid-cols-2">
      <Card>
        <SafetyModelList title={t('safety.safest')} info={info} models={stats.safestModels} />
      </Card>
      <Card>
        <SafetyModelList title={t('safety.leastSafe')} info={info} models={stats.leastSafeModels} />
      </Card>
    </div>
  )
}
