import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { JobStatus } from '@carplates/shared'

import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { datasetStatus, lastSync } from '@/routes/data-status/helpers'
import StatusChip from '@/routes/data-status/StatusChip'
import type { Cadence, Dataset } from '@/routes/data-status/types'
import { monthYearLabel } from '@/routes/stats/helpers'

type Props = {
  cadence: Cadence
  datasets: readonly Dataset[]
  jobs: readonly JobStatus[]
  latest: Readonly<Record<string, string | null>>
  /** Rows we hold per dataset id. */
  counts: Readonly<Record<string, number>>
}

export default function DatasetGroup({ cadence, datasets, jobs, latest, counts }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const dateFormat = new Intl.DateTimeFormat(toIntlLocale(i18n.language), { dateStyle: 'medium' })
  const dayFormat = new Intl.DateTimeFormat(toIntlLocale(i18n.language), { dateStyle: 'medium', timeZone: 'UTC' })

  return (
    <Card id={cadence} className="scroll-mt-20 space-y-2">
      <h2 className="text-lg font-semibold">
        {t(`dataStatus.cadence.${cadence}`)} ({datasets.length})
      </h2>
      <p className="text-sm text-muted">{t(`dataStatus.cadence.${cadence}.desc`)}</p>

      <ul className="divide-y divide-border text-sm">
        {datasets.map(dataset => {
          const synced = lastSync(dataset, jobs)
          const newest = latest[dataset.id]
          const rows = counts[dataset.id] ?? dataset.staticCount
          const newestLabel = newest
            ? dataset.latestByMonth
              ? monthYearLabel(newest, toIntlLocale(i18n.language))
              : dayFormat.format(new Date(`${newest}T00:00:00Z`))
            : null
          return (
            <li
              key={dataset.id}
              id={`dataset-${dataset.id}`}
              className="flex scroll-mt-20 flex-wrap items-center gap-x-3 gap-y-1 py-2 target:bg-primary/10"
            >
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
                    : dataset.cadence === 'minutely'
                      ? t('dataStatus.byPoll')
                      : dataset.cadence === 'live'
                        ? t('dataStatus.byRequest')
                        : t('dataStatus.byHand')}
                </span>
                {rows !== undefined && (
                  <span className="mt-0.5 block text-xs text-muted">
                    {t('dataStatus.records', { count: numberFormat.format(rows) })}
                  </span>
                )}
                {dataset.noteKey && <span className="mt-0.5 block text-xs text-muted">{t(dataset.noteKey)}</span>}
              </span>
              <span className="text-muted">
                {synced
                  ? t('dataStatus.synced', { date: dateFormat.format(synced) })
                  : dataset.cadence !== 'minutely' && t('dataStatus.neverSynced')}
                {newestLabel && <span className="block text-xs">{t('dataStatus.latest', { date: newestLabel })}</span>}
              </span>
              <StatusChip status={datasetStatus(dataset, jobs)} />
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
