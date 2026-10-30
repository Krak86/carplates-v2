import type { ReactNode } from 'react'
import { CATALOG_INDEX_PATH, catalogMakePath, catalogParamsSchema, localizeRegistryRows } from '@carplates/shared'
import type { CatalogModel } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'

import BrandLogo from '@/components/BrandLogo'
import CatalogBreadcrumb from '@/components/catalog/CatalogBreadcrumb'
import { CompareTrayBar, CompareTrayButton } from '@/components/compare/CompareTray'
import CatalogSiblingChips from '@/components/catalog/CatalogSiblingChips'
import ModelVariants from '@/components/catalog/ModelVariants'
import Card from '@/components/ui/Card'
import SectionSkeleton from '@/components/ui/SectionSkeleton'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ApiError } from '@/lib/api'
import { toIntlLocale } from '@/lib/intl'
import { localizeRegion } from '@/lib/region-label'
import { catalogModelQuery } from '@/lib/queries'

import CatalogStatsSection from './CatalogStatsSection'
import { typicalYear, yearRangeLabel } from './helpers'

function CatalogNotFound(): ReactNode {
  const { t } = useTranslation()

  return (
    <Card>
      <h1 className="mb-2 text-xl font-semibold">{t('catalog.notFound')}</h1>
      <Link to="/" className="text-[var(--color-primary)] underline">
        {t('catalog.lookup')}
      </Link>
    </Card>
  )
}

function CatalogSummary({ model }: { model: CatalogModel }): ReactNode {
  const { t, i18n } = useTranslation()
  const name = `${model.makeName} ${model.modelName}`.trim()
  const years = yearRangeLabel(model)
  const topFuel = localizeRegistryRows('fuel', model.stats.fuel, i18n.language)[0]?.[0]
  const topRegion = model.stats.regions[0]?.[0]
  const count = model.n.toLocaleString(toIntlLocale(i18n.language))

  return (
    <p className="text-base">
      {t('catalog.summary', { name, count, years: years ? ` ${t('catalog.summaryYears', { years })}` : '' })}
      {topFuel ? ` ${t('catalog.summaryFuel', { fuel: topFuel })}` : ''}
      {topRegion ? ` ${t('catalog.summaryRegion', { region: localizeRegion(topRegion, i18n.language) })}` : ''}
    </p>
  )
}

// Lazy-loaded (see App.tsx). `/cars/:make/:model`: registry rollup of the model plus the card's model-level sections.
export default function CatalogModelRoute(): ReactNode {
  const { t } = useTranslation()
  const params = catalogParamsSchema.safeParse(useParams())
  const make = params.success ? params.data.make : ''
  const modelSlug = params.success ? params.data.model : ''
  const query = useQuery({ ...catalogModelQuery(make, modelSlug), enabled: params.success })
  const model = query.data
  useDocumentTitle(model ? `${model.makeName} ${model.modelName}`.trim() : undefined)

  if (!params.success || (query.error instanceof ApiError && query.error.status === 404)) return <CatalogNotFound />
  if (query.isError) {
    return (
      <Card>
        <p className="text-base text-[var(--color-muted)]">{t('result.error')}</p>
      </Card>
    )
  }
  if (!model) {
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
          { label: model.makeName, to: catalogMakePath(model.make) },
          { label: model.modelName }
        ]}
      />

      <Card>
        <div className="mb-2 flex items-center gap-3">
          <BrandLogo brand={model.topBrand} size="sm" placeholder />
          <h1 className="text-xl font-semibold">
            {t('catalog.title', { name: `${model.makeName} ${model.modelName}`.trim() })}
          </h1>
        </div>
        <CatalogSummary model={model} />
        {typicalYear(model.stats.years) && (
          <p className="mt-2">
            <CompareTrayButton
              reference={{
                kind: 'model',
                make: model.make,
                model: model.model,
                year: typicalYear(model.stats.years) as number,
                fuel: null
              }}
              label={`${model.makeName} ${model.modelName}`.trim()}
            />
          </p>
        )}
        <p className="mt-2 text-base">
          <Link to="/" className="text-[var(--color-primary)] underline">
            {t('catalog.lookup')}
          </Link>
        </p>
      </Card>

      <CatalogStatsSection model={model} />

      <Card>
        <ModelVariants key={`${model.make}/${model.model}`} model={model} />
      </Card>

      <Card>
        <h2 className="mb-2 text-lg font-semibold">{t('catalog.otherModels')}</h2>
        <CatalogSiblingChips model={model} />
      </Card>
      <CompareTrayBar />
    </main>
  )
}
