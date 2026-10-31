import type { ReactNode } from 'react'
import type { RoadSafetyRegionsResponse } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
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
    <Card className="mb-4">
      <h2 className="mb-2 text-base font-semibold">{t('roadSafety.source.title')}</h2>

      <ul className="space-y-1 text-sm">
        <li>
          <a href={PATROL_URL} target="_blank" rel="noopener noreferrer" className="font-medium underline">
            {t('roadSafety.source.patrol')}
          </a>{' '}
          <span className="text-[var(--color-muted)]">{t('roadSafety.source.patrolNote')}</span>
        </li>

        <li>
          <a href={HAZARD_URL} target="_blank" rel="noopener noreferrer" className="font-medium underline">
            {t('roadSafety.source.hazards')}
          </a>{' '}
          <span className="text-[var(--color-muted)]">{t('roadSafety.source.hazardsNote')}</span>
        </li>

        <li className="text-[var(--color-muted)]">{t('roadSafety.source.fleet')}</li>
      </ul>

      <p className="mt-2 text-xs text-[var(--color-muted)]">
        {month === null
          ? t('roadSafety.source.periodFull', { year: data.year })
          : t('roadSafety.source.periodPartial', { year: data.year, month })}{' '}
        {t('roadSafety.source.counted')}
      </p>
    </Card>
  )
}
