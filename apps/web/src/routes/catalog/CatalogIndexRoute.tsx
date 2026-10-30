import { useState } from 'react'
import type { ReactNode } from 'react'
import { catalogMakePath } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import BrandLogo from '@/components/BrandLogo'
import CatalogBreadcrumb from '@/components/catalog/CatalogBreadcrumb'
import Card from '@/components/ui/Card'
import SectionSkeleton from '@/components/ui/SectionSkeleton'
import { toIntlLocale } from '@/lib/intl'
import { catalogMakesQuery } from '@/lib/queries'

import { filterMakes } from './helpers'

// Lazy-loaded (see App.tsx). `/cars`: every make of the catalog with its car and model counts.
export default function CatalogIndexRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const [filter, setFilter] = useState('')
  const query = useQuery(catalogMakesQuery())
  const makes = query.data?.makes
  const format = new Intl.NumberFormat(toIntlLocale(i18n.language))

  if (query.isError) {
    return (
      <Card>
        <p className="text-base text-[var(--color-muted)]">{t('result.error')}</p>
      </Card>
    )
  }
  if (!makes) {
    return (
      <Card>
        <SectionSkeleton rows={5} />
      </Card>
    )
  }

  const visible = filterMakes(makes, filter)
  const total = makes.reduce((sum, m) => sum + m.n, 0)

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4">
      <CatalogBreadcrumb crumbs={[{ label: t('catalog.crumbHome'), to: '/' }, { label: t('catalog.crumbCars') }]} />

      <Card>
        <h1 className="mb-2 text-xl font-semibold">{t('catalog.indexTitle')}</h1>
        <p className="text-base">
          {t('catalog.indexSummary', { count: format.format(total), makes: format.format(makes.length) })}
        </p>
        <input
          type="search"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          aria-label={t('catalog.filterLabel')}
          placeholder={t('catalog.filterLabel')}
          className="mt-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-base sm:max-w-xs"
        />
      </Card>

      <Card>
        {visible.length === 0 ? (
          <p className="text-base text-[var(--color-muted)]">{t('catalog.noMatch')}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map(m => (
              <li key={m.make}>
                <Link
                  to={catalogMakePath(m.make)}
                  className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2 transition-colors hover:border-[var(--color-primary)]"
                >
                  <span className="flex h-6 w-8 shrink-0 items-center justify-center">
                    <BrandLogo brand={m.topBrand} size="sm" placeholder />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium">{m.makeName}</span>
                    <span className="block text-sm text-[var(--color-muted)]">
                      {t('catalog.carsCount', { count: format.format(m.n) })}
                      {' · '}
                      {t('catalog.modelsCount', { count: m.modelCount })}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  )
}
