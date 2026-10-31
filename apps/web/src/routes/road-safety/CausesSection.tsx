import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { roadSafetyCausesQuery } from '@/lib/queries'
import RankBars from '@/routes/road-safety/RankBars'
import SectionSkeleton from '@/routes/road-safety/SectionSkeleton'

type Props = {
  year: number | undefined
}

/** Top crash causes and crash types by deaths (names as in the Patrol Police files). */
export default function CausesSection({ year }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const causes = useQuery(roadSafetyCausesQuery(year))
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))

  if (causes.isError) return null
  if (!causes.data) return <SectionSkeleton />

  const toRows = (entries: typeof causes.data.causes) =>
    entries.map(e => ({
      key: e.name,
      label: e.name,
      value: e.deaths,
      valueText: numberFormat.format(e.deaths),
      detail: t('roadSafety.crashesCount', { count: numberFormat.format(e.crashes) })
    }))

  return (
    <div className="mb-6 grid gap-3 lg:grid-cols-2">
      {causes.data.causes.length > 0 && (
        <Card>
          <h2 className="mb-3 text-base font-semibold">{t('roadSafety.causes.title')}</h2>
          <RankBars rows={toRows(causes.data.causes)} ariaLabel={t('roadSafety.causes.title')} collapsible />
        </Card>
      )}

      {causes.data.types.length > 0 && (
        <Card>
          <h2 className="mb-3 text-base font-semibold">{t('roadSafety.types.title')}</h2>
          <RankBars rows={toRows(causes.data.types)} ariaLabel={t('roadSafety.types.title')} collapsible />
        </Card>
      )}
    </div>
  )
}
