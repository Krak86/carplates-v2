import type { MouseEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { JobStatus } from '@carplates/shared'

import Card from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { DATASETS } from '@/routes/data-status/datasets'
import { datasetStatus, groupByCadence, lastSync } from '@/routes/data-status/helpers'

type Props = {
  jobs: readonly JobStatus[]
}

/** Smooth-scrolls to the tile and flashes it; plain anchor jumps stay as the no-JS fallback. */
function jumpTo(e: MouseEvent<HTMLAnchorElement>, id: string): void {
  const el = document.getElementById(id)
  if (!el) return
  e.preventDefault()
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  history.replaceState(null, '', `#${id}`)
  el.classList.add('bg-primary/10')
  window.setTimeout(() => el.classList.remove('bg-primary/10'), 1800)
}

/** Every source with its last update, newest first (sources never synced last); each row jumps to the dataset's tile below. */
export default function RunHistory({ jobs }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const format = new Intl.DateTimeFormat(toIntlLocale(i18n.language), { dateStyle: 'medium', timeStyle: 'short' })
  const rows = DATASETS.map(dataset => ({
    dataset,
    synced: lastSync(dataset, jobs),
    status: datasetStatus(dataset, jobs)
  })).sort((a, b) => (b.synced?.getTime() ?? -1) - (a.synced?.getTime() ?? -1))

  return (
    <Card className="space-y-2">
      <h2 className="text-lg font-semibold">
        {t('dataStatus.history')} ({rows.length})
      </h2>
      <nav aria-label={t('dataStatus.history')} className="flex flex-wrap gap-1.5 text-xs">
        {groupByCadence(DATASETS).map(group => (
          <a
            key={group.cadence}
            href={`#${group.cadence}`}
            onClick={e => jumpTo(e, group.cadence)}
            className="rounded-full border border-border px-2.5 py-1 hover:text-primary"
          >
            {t(`dataStatus.cadence.${group.cadence}`)} ({group.datasets.length})
          </a>
        ))}
      </nav>
      <ul className="max-h-72 overflow-y-auto pl-1 text-sm">
        {rows.map(({ dataset, synced, status }) => (
          <li key={dataset.id} className="relative ml-0 border-l border-border pl-4">
            <span
              aria-hidden
              className={cn(
                'absolute top-2.5 left-[-0.28rem] size-2 rounded-full',
                status === 'failing' ? 'bg-red-500' : synced ? 'bg-primary' : 'bg-muted'
              )}
            />
            <a
              href={`#dataset-${dataset.id}`}
              onClick={e => jumpTo(e, `dataset-${dataset.id}`)}
              className="flex flex-wrap items-center gap-x-3 py-1 hover:text-primary"
            >
              <span className="min-w-0">{dataset.name}</span>
              <span className="text-muted">
                {synced
                  ? format.format(synced)
                  : dataset.cadence === 'minutely' || dataset.cadence === 'live'
                    ? t(`dataStatus.cadence.${dataset.cadence}`)
                    : t('dataStatus.neverSynced')}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  )
}
