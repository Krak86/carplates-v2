import type { ReactNode } from 'react'
import type { RoadSafetyRegionsResponse } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import PageSources from '@/components/PageSources'
import { partialMonth } from '@/routes/road-safety/helpers'

type Props = {
  data: RoadSafetyRegionsResponse
}

const PATROL_URL = 'https://patrolpolice.gov.ua/statystyka/'
const HAZARD_URL = 'https://data.gov.ua/dataset/9b6a7292-b0cd-419e-8143-19da0661edfb'

/** "Source data" strip at the top: where the numbers come from, which file period is shown, and what was counted. */
export default function SourceData({ data }: Props): ReactNode {
  const { t } = useTranslation()
  const current = data.years.find(y => y.year === data.year)
  const month = current ? partialMonth(current) : null

  return (
    <PageSources
      sources={[
        { label: t('roadSafety.source.patrol'), url: PATROL_URL, note: t('roadSafety.source.patrolNote') },
        { label: t('roadSafety.source.hazards'), url: HAZARD_URL, note: t('roadSafety.source.hazardsNote') }
      ]}
      lines={[t('roadSafety.source.fleet')]}
      footer={`${
        month === null
          ? t('roadSafety.source.periodFull', { year: data.year })
          : t('roadSafety.source.periodPartial', { year: data.year, month })
      } ${t('roadSafety.source.counted')}`}
    />
  )
}
