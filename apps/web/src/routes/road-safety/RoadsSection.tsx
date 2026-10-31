import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { roadSafetyRoadsQuery } from '@/lib/queries'
import RankBars from '@/routes/road-safety/RankBars'
import SectionSkeleton from '@/routes/road-safety/SectionSkeleton'

type Props = {
  year: number | undefined
}

/** State roads by deaths. Mounted by `LazySection`: its chunk and query start only near the viewport. */
export default function RoadsSection({ year }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const roads = useQuery(roadSafetyRoadsQuery(year))
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))

  if (roads.isError) return null
  if (!roads.data) return <SectionSkeleton />

  return (
    <Card className="mb-6">
      <h2 className="mb-1 text-base font-semibold">{t('roadSafety.roads.title')}</h2>
      <p className="mb-3 text-xs text-[var(--color-muted)]">{t('roadSafety.roads.note')}</p>

      <RankBars
        ariaLabel={t('roadSafety.roads.title')}
        collapsible
        rows={roads.data.roads.map(r => ({
          key: r.roadCode,
          label: r.roadCode,
          value: r.deaths,
          valueText: numberFormat.format(r.deaths),
          detail: r.roadName
        }))}
      />
    </Card>
  )
}
