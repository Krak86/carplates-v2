import type { ReactNode } from 'react'
import type { CatalogModel } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { localizeRegion } from '@/lib/region-label'

import CatalogBarList from './CatalogBarList'
import { CATALOG_BLOCK_ROWS, CATALOG_BLOCK_YEARS, biggestYears } from './helpers'

type Props = {
  model: CatalogModel
}

/** The "In Ukraine" section: registry rollups of the model (years, fuel, body, colour, regions). */
export default function CatalogStatsSection({ model }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const { stats, n } = model
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const formatCount = (value: number): string => numberFormat.format(value)
  const lowerLabel = (label: string): string => label.toLocaleLowerCase('uk-UA')

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">{t('catalog.statsHeading')}</h2>

      <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
        <CatalogBarList
          title={t('catalog.years')}
          rows={biggestYears(stats.years, CATALOG_BLOCK_YEARS)}
          total={n}
          formatCount={formatCount}
        />
        <CatalogBarList
          title={t('catalog.fuel')}
          rows={stats.fuel.slice(0, CATALOG_BLOCK_ROWS)}
          total={n}
          formatLabel={lowerLabel}
          formatCount={formatCount}
        />
        <CatalogBarList
          title={t('catalog.body')}
          rows={stats.body.slice(0, CATALOG_BLOCK_ROWS)}
          total={n}
          formatLabel={lowerLabel}
          formatCount={formatCount}
        />
        <CatalogBarList
          title={t('catalog.color')}
          rows={stats.color.slice(0, CATALOG_BLOCK_ROWS)}
          total={n}
          formatLabel={lowerLabel}
          formatCount={formatCount}
        />
        <CatalogBarList
          title={t('catalog.regions')}
          rows={stats.regions.slice(0, CATALOG_BLOCK_ROWS)}
          total={n}
          formatLabel={label => localizeRegion(label, i18n.language)}
          formatCount={formatCount}
        />
      </div>

      {(!!stats.capacityP50 || !!stats.powerP50) && (
        <p className="mt-3 text-base text-[var(--color-muted)]">
          {[
            stats.capacityP50 ? t('catalog.capacityMedian', { value: formatCount(stats.capacityP50) }) : null,
            stats.powerP50 ? t('catalog.powerMedian', { value: formatCount(stats.powerP50) }) : null
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </Card>
  )
}
