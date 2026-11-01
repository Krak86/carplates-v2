import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { toIntlLocale } from '@/lib/intl'
import { dataStatusQuery } from '@/lib/queries'
import { DATASETS } from '@/routes/data-status/datasets'
import { lastSync } from '@/routes/data-status/helpers'

type Props = {
  /** `DATASETS` ids behind the page: shows the newest sync among them. Omit when the page prints its own timestamp: only the link shows. */
  datasets?: readonly string[]
}

/** The "Updated <date> - Data freshness" chip for a page fed by a scheduled job or a seed CSV; links to `/data-status`. */
export default function DataFreshness({ datasets }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const status = useQuery(dataStatusQuery())

  const jobs = status.data?.jobs ?? []
  const syncs = DATASETS.filter(d => datasets?.includes(d.id)).flatMap(d => lastSync(d, jobs) ?? [])
  const newest = syncs.length > 0 ? new Date(Math.max(...syncs.map(d => d.getTime()))) : null
  const date = newest
    ? new Intl.DateTimeFormat(toIntlLocale(i18n.language), { dateStyle: 'medium' }).format(newest)
    : null

  return (
    <p className="inline-block rounded bg-[var(--color-bg)]/85 px-2 py-1 text-sm text-[var(--color-muted)] backdrop-blur-sm">
      {date && <>{t('dataStatus.synced', { date })} </>}
      <Link viewTransition to="/data-status" className="text-primary underline">
        {t('dataStatus.link')}
      </Link>
    </p>
  )
}
