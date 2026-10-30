import type { ReactNode } from 'react'
import { CATALOG_INDEX_PATH, catalogMakeParamsSchema, catalogPath } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'

import BrandLogo from '@/components/BrandLogo'
import CatalogBreadcrumb from '@/components/catalog/CatalogBreadcrumb'
import Card from '@/components/ui/Card'
import SectionSkeleton from '@/components/ui/SectionSkeleton'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ApiError } from '@/lib/api'
import { toIntlLocale } from '@/lib/intl'
import { catalogMakeQuery } from '@/lib/queries'

import { yearRangeLabel } from './helpers'

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
  const query = useQuery({ ...catalogMakeQuery(slug), enabled: params.success })
  const make = query.data
  const format = new Intl.NumberFormat(toIntlLocale(i18n.language))
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
      </Card>

      <Card>
        <h2 className="mb-2 text-lg font-semibold">{t('catalog.modelsHeading')}</h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {make.models.map(m => {
            const years = yearRangeLabel(m)

            return (
              <li key={m.model}>
                <Link
                  to={catalogPath(make.make, m.model)}
                  className="flex items-baseline justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2 transition-colors hover:border-[var(--color-primary)]"
                >
                  <span className="min-w-0 truncate text-base font-medium">{`${make.makeName} ${m.modelName}`}</span>
                  <span className="shrink-0 text-right text-sm text-[var(--color-muted)]">
                    {t('catalog.carsCount', { count: format.format(m.n) })}
                    {years ? ` · ${years}` : ''}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </Card>
    </main>
  )
}
