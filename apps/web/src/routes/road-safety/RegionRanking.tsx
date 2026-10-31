import type { ReactNode } from 'react'
import type { RoadSafetyRegionsResponse } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { rankedRegions } from '@/routes/road-safety/helpers'
import RankBars from '@/routes/road-safety/RankBars'
import type { RankRow } from '@/routes/road-safety/RankBars'

type Props = {
  regions: RoadSafetyRegionsResponse['regions']
}

/** The most dangerous regions two ways: absolute deaths and deaths per 100k registered cars (today's fleet, not drivers). */
export default function RegionRanking({ regions }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const numberFormat = new Intl.NumberFormat(locale)
  const rateFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 })

  const byDeaths: RankRow[] = rankedRegions(regions, 'deaths').map(r => ({
    key: r.region,
    label: r.region,
    value: r.deaths,
    valueText: numberFormat.format(r.deaths),
    detail: t('roadSafety.crashesCount', { count: numberFormat.format(r.crashes) })
  }))

  const byRate: RankRow[] = rankedRegions(regions, 'rate').map(r => ({
    key: r.region,
    label: r.region,
    value: r.deathsPer100k ?? 0,
    valueText: rateFormat.format(r.deathsPer100k ?? 0),
    detail: t('roadSafety.deathsCount', { count: numberFormat.format(r.deaths) })
  }))

  return (
    <div className="mb-6 grid gap-3 lg:grid-cols-2">
      <Card>
        <h2 className="mb-3 text-base font-semibold">{t('roadSafety.regions.byDeaths')}</h2>
        <RankBars rows={byDeaths} ariaLabel={t('roadSafety.regions.byDeaths')} collapsible />
      </Card>

      <Card>
        <h2 className="mb-1 text-base font-semibold">{t('roadSafety.regions.byRate')}</h2>
        <p className="mb-3 text-xs text-[var(--color-muted)]">{t('roadSafety.regions.rateNote')}</p>
        <RankBars rows={byRate} ariaLabel={t('roadSafety.regions.byRate')} collapsible />
      </Card>
    </div>
  )
}
