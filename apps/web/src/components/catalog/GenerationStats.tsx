import type { ReactNode } from 'react'
import { localizeRegistryRows, sumYearStats } from '@carplates/shared'
import type { CatalogYearStats } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import { toIntlLocale } from '@/lib/intl'
import { localizeRegion } from '@/lib/region-label'
import CatalogBarList from '@/routes/catalog/CatalogBarList'
import { CATALOG_BLOCK_ROWS, sharePercent } from '@/routes/catalog/helpers'

type Props = {
  /** Display name of the generation (`B6`). */
  name: string
  span: { yearFrom: number; yearTo: number | null }
  byYear: CatalogYearStats
  /** Cars of the whole model, for the "share of the model" line. */
  modelTotal: number
}

/** Fuel, body, colour and region of the cars built in one generation's years: the per-year rollups summed. */
export default function GenerationStats({ name, span, byYear, modelTotal }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const sums = sumYearStats(byYear, span.yearFrom, span.yearTo)
  if (sums.n === 0) return null

  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const formatCount = (value: number): string => numberFormat.format(value)

  return (
    <section className="mb-4 border-b border-[var(--color-border)] pb-4">
      <h3 className="text-base font-semibold">{t('catalog.generationStats', { name })}</h3>
      <p className="mb-2 text-sm text-[var(--color-muted)]">
        {t('catalog.generationShare', { count: formatCount(sums.n), share: sharePercent(sums.n, modelTotal) })}
      </p>

      <div className="grid items-start gap-3 md:grid-cols-2">
        <CatalogBarList
          title={t('catalog.fuel')}
          rows={localizeRegistryRows('fuel', sums.fuel, i18n.language).slice(0, CATALOG_BLOCK_ROWS)}
          total={sums.n}
          formatCount={formatCount}
        />
        <CatalogBarList
          title={t('catalog.body')}
          rows={localizeRegistryRows('body', sums.body, i18n.language).slice(0, CATALOG_BLOCK_ROWS)}
          total={sums.n}
          formatCount={formatCount}
        />
        <CatalogBarList
          title={t('catalog.color')}
          rows={localizeRegistryRows('color', sums.color, i18n.language).slice(0, CATALOG_BLOCK_ROWS)}
          total={sums.n}
          formatCount={formatCount}
        />
        <CatalogBarList
          title={t('catalog.regions')}
          rows={sums.regions.slice(0, CATALOG_BLOCK_ROWS)}
          total={sums.n}
          formatLabel={label => localizeRegion(label, i18n.language)}
          formatCount={formatCount}
        />
      </div>
    </section>
  )
}
