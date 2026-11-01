import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { JobStatus } from '@carplates/shared'

import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { datasetStatus, lastSync } from '@/routes/data-status/helpers'
import StatusChip from '@/routes/data-status/StatusChip'
import type { Cadence, Dataset } from '@/routes/data-status/types'

type Props = {
  cadence: Cadence
  datasets: readonly Dataset[]
  jobs: readonly JobStatus[]
}

export default function DatasetGroup({ cadence, datasets, jobs }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const dateFormat = new Intl.DateTimeFormat(toIntlLocale(i18n.language), { dateStyle: 'medium' })

  return (
    <Card id={cadence} className="space-y-2">
      <h2 className="text-lg font-semibold">{t(`dataStatus.cadence.${cadence}`)}</h2>
      <p className="text-sm text-muted">{t(`dataStatus.cadence.${cadence}.desc`)}</p>

      <ul className="divide-y divide-border text-sm">
        {datasets.map(dataset => {
          const synced = lastSync(dataset, jobs)
          return (
            <li key={dataset.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="min-w-0 flex-1 basis-56">
                {dataset.to ? (
                  <Link viewTransition to={dataset.to} className="text-primary hover:underline">
                    {dataset.name}
                  </Link>
                ) : (
                  dataset.name
                )}
                <span className="block text-xs text-muted">
                  {dataset.job
                    ? t('dataStatus.byJob')
                    : dataset.cadence === 'live'
                      ? t('dataStatus.byRequest')
                      : t('dataStatus.byHand')}
                </span>
              </span>
              <span className="text-muted">
                {synced ? t('dataStatus.synced', { date: dateFormat.format(synced) }) : t('dataStatus.neverSynced')}
              </span>
              <StatusChip status={datasetStatus(dataset, jobs)} />
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
