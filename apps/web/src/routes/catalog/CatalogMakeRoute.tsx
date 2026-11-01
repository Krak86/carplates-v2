import { lazy, useState } from 'react'
import type { ReactNode } from 'react'
import { CATALOG_INDEX_PATH, catalogMakeParamsSchema, catalogPath, stockCompanyFor } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { CompareTrayBar, CompareTrayButton } from '@/components/compare/CompareTray'

import BrandLogo from '@/components/BrandLogo'
import CatalogAdvancedSearchNote from '@/components/catalog/CatalogAdvancedSearchNote'
import CatalogAuctionLine from '@/components/catalog/CatalogAuctionLine'
import CatalogBreadcrumb from '@/components/catalog/CatalogBreadcrumb'
import LazySection from '@/components/LazySection'
import Card from '@/components/ui/Card'
import SectionSkeleton from '@/components/ui/SectionSkeleton'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ApiError } from '@/lib/api'
import { toIntlLocale } from '@/lib/intl'
import { catalogMakeQuery } from '@/lib/queries'

import { filterModels, yearRangeLabel } from './helpers'

const SharePriceSection = lazy(() => import('@/components/SharePriceSection'))

/** The make's share price in its own card; nothing at all for a make with no listed company. */
function SharePriceCard({ brand }: { brand: string }): ReactNode {
  if (!stockCompanyFor(brand)) return null

  return (
    <Card>
      <SharePriceSection brand={brand} standalone half />
    </Card>
  )
}

function CatalogMakeNotFound(): ReactNode {
  const { t } = useTranslation()

  return (
    <Card>
      <h1 className="mb-2 text-xl font-semibold">{t('catalog.makeNotFound')}</h1>
      <Link to={CATALOG_INDEX_PATH} className="text-[var(--color-primary)] underline">
        {t('catalog.browseLink')}
      </Link>
    </Card>
  )
}

// Lazy-loaded (see App.tsx). `/cars/:make`: the make's model pages, biggest first.
export default function CatalogMakeRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const params = catalogMakeParamsSchema.safeParse(useParams())
  const slug = params.success ? params.data.make : ''
  const [filter, setFilter] = useState('')
  const query = useQuery({ ...catalogMakeQuery(slug), enabled: params.success })
  const make = query.data
  const format = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const maxCount = Math.max(1, ...(make?.models.map(m => m.n) ?? []))
  useDocumentTitle(make?.makeName)

  if (!params.success || (query.error instanceof ApiError && query.error.status === 404)) return <CatalogMakeNotFound />
  if (query.isError) {
    return (
      <Card>
        <p className="text-base text-[var(--color-muted)]">{t('result.error')}</p>
      </Card>
    )
  }
  if (!make) {
    return (
      <Card>
        <SectionSkeleton rows={5} />
      </Card>
    )
  }

  const visibleModels = filterModels(make.models, filter)

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4">
      <CatalogBreadcrumb
        crumbs={[
          { label: t('catalog.crumbHome'), to: '/' },
          { label: t('catalog.crumbCars'), to: CATALOG_INDEX_PATH },
          { label: make.makeName }
        ]}
      />

      <Card>
        <div className="mb-2 flex items-center gap-3">
          <BrandLogo brand={make.topBrand} size="sm" placeholder />
          <h1 className="text-xl font-semibold">{t('catalog.title', { name: make.makeName })}</h1>
        </div>
        <p className="text-base">
          {t('catalog.makeSummary', {
            count: format.format(make.n),
            make: make.makeName,
            models: format.format(make.modelCount)
          })}
        </p>
        <CatalogAuctionLine makeName={make.makeName} />
      </Card>

      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t('catalog.modelsHeading')}</h2>
          <input
            type="search"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            aria-label={t('catalog.filterModelLabel')}
            placeholder={t('catalog.filterModelLabel')}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-base sm:max-w-xs"
          />
        </div>

        {visibleModels.length === 0 ? (
          <p className="text-base text-[var(--color-muted)]">{t('catalog.noModelMatch')}</p>
        ) : (
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-sm text-[var(--color-muted)]">
                <th scope="col" className="py-1.5 pr-3 font-normal">
                  {t('catalog.colModel')}
                </th>
                <th scope="col" className="py-1.5 pr-3 text-right font-normal">
                  {t('catalog.colCars')}
                </th>
                <th scope="col" className="hidden py-1.5 pr-3 font-normal sm:table-cell">
                  {t('catalog.colYears')}
                </th>
                <th scope="col" className="hidden w-1/4 py-1.5 font-normal md:table-cell">
                  <span className="sr-only">%</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleModels.map(m => {
                const years = yearRangeLabel(m)
                const pct = Math.max(1, Math.round((m.n / maxCount) * 100))

                return (
                  <tr
                    key={m.model}
                    className="border-b border-[var(--color-border)]/50 transition-colors last:border-0 hover:bg-[var(--color-primary)]/10"
                  >
                    <th scope="row" className="py-1.5 pr-3 text-left font-medium">
                      <Link to={catalogPath(make.make, m.model)} className="hover:text-[var(--color-primary)]">
                        {`${make.makeName} ${m.modelName}`}
                      </Link>
                      {m.yearMin && m.yearMax && (
                        <span className="ml-2 align-middle">
                          <CompareTrayButton
                            reference={{
                              kind: 'model',
                              make: make.make,
                              model: m.model,
                              year: Math.round((m.yearMin + m.yearMax) / 2),
                              fuel: null
                            }}
                            label={`${make.makeName} ${m.modelName}`}
                          />
                        </span>
                      )}
                    </th>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{format.format(m.n)}</td>
                    <td className="hidden py-1.5 pr-3 text-[var(--color-muted)] tabular-nums sm:table-cell">{years}</td>
                    <td className="hidden py-1.5 md:table-cell">
                      <span
                        aria-hidden
                        className="block h-2 rounded bg-[var(--color-primary)]"
                        style={{ width: `${pct}%` }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      <LazySection>
        <SharePriceCard brand={make.topBrand} />
      </LazySection>

      <Card>
        <CatalogAdvancedSearchNote brand={make.topBrand} />
      </Card>
      <CompareTrayBar />
    </main>
  )
}
