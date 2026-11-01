import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { dataStatusQuery } from '@/lib/queries'
import DatasetGroup from '@/routes/data-status/DatasetGroup'
import { DATASETS } from '@/routes/data-status/datasets'
import { countByStatus, datasetStatus, groupByCadence, registryStatus } from '@/routes/data-status/helpers'
import StatusChip from '@/routes/data-status/StatusChip'
import { STATUSES } from '@/routes/data-status/types'
import { monthYearLabel } from '@/routes/stats/helpers'

// Lazy-loaded (see App.tsx).
export default function DataStatusRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const status = useQuery(dataStatusQuery())

  const registry = status.data?.registry
  const jobs = status.data?.jobs ?? []
  const counts = countByStatus(DATASETS.map(d => datasetStatus(d, jobs)))

  return (
    <article className="mx-auto w-full max-w-6xl space-y-4">
      <Card className="space-y-2">
        <h1 className="text-2xl font-bold">
          <span aria-hidden>🗓️</span> {t('dataStatus.title')}
        </h1>
        <p className="text-muted">{t('dataStatus.intro')}</p>
      </Card>

      <Card className="space-y-2">
        <h2 className="text-lg font-semibold">{t('dataStatus.registry.title')}</h2>
        {status.isPending && <p className="text-muted">{t('dataStatus.loading')}</p>}
        {status.isError && <p className="text-muted">{t('result.error')}</p>}
        {registry?.firstDate && registry.lastDate && (
          <p className="flex flex-wrap items-center gap-2">
            <span>
              {t('dataStatus.registry.span', {
                from: registry.firstDate.slice(0, 4),
                to: monthYearLabel(registry.lastDate, locale)
              })}
            </span>
            <StatusChip status={registryStatus(registry.lastDate)} />
          </p>
        )}
        <p className="text-sm text-muted">{t('dataStatus.registry.lag')}</p>
      </Card>

      {status.isSuccess && (
        <>
          <Card className="space-y-2">
            <h2 className="text-lg font-semibold">{t('dataStatus.summary')}</h2>
            <ul className="flex flex-wrap gap-3 text-sm">
              {STATUSES.filter(s => counts[s]).map(s => (
                <li key={s} className="flex items-center gap-1.5">
                  <StatusChip status={s} />
                  <span className="tabular-nums">{counts[s]}</span>
                  <span className="text-muted">{t(`dataStatus.status.${s}.desc`)}</span>
                </li>
              ))}
            </ul>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {groupByCadence(DATASETS).map(group => (
              <DatasetGroup key={group.cadence} cadence={group.cadence} datasets={group.datasets} jobs={jobs} />
            ))}
          </div>
        </>
      )}
    </article>
  )
}
