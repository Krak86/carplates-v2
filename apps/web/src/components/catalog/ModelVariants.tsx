import { useState } from 'react'
import type { ReactNode } from 'react'
import { resolveFuelCategories } from '@carplates/shared'
import type { CatalogModel } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import CompareChip from '@/components/compare/CompareChip'
import { generationLabel, generationSpanText } from '@/components/GenerationChip.helpers'
import { toIntlLocale } from '@/lib/intl'
import { catalogYearsQuery, generationGrowthQuery } from '@/lib/queries'
import { typicalYear } from '@/routes/catalog/helpers'

import GenerationStats from './GenerationStats'
import { carsInSpan, generationOfYear, variantOptions, variantYears, yearInSpan } from './ModelVariants.helpers'
import ModelSections from './ModelSections'
import VariantChipRow from './VariantChipRow'

type Props = {
  model: CatalogModel
}

/**
 * Year, generation, fuel and body chips over the model-only sections. The choice is local state that re-feeds
 * `ModelSections` (specs, value, recalls... follow it); the page and its URL stay the model's. The defaults are the
 * registry's typical car: the most common year, fuel and body. Mount it with a `key` per model.
 */
export default function ModelVariants({ model }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const { stats } = model
  const [year, setYear] = useState(() => typicalYear(stats.years))
  const [fuel, setFuel] = useState<string | null>(stats.fuel[0]?.[0] ?? null)
  const [body, setBody] = useState<string | null>(stats.body[0]?.[0] ?? null)
  const generations = useQuery(generationGrowthQuery(model.topBrand, model.topModel)).data?.match?.generations ?? []
  const currentGeneration = generationOfYear(generations, year)
  const byYear = useQuery({ ...catalogYearsQuery(model.make, model.model), enabled: generations.length > 0 }).data
  const formatCount = new Intl.NumberFormat(toIntlLocale(i18n.language)).format

  const fuels = variantOptions('fuel', stats.fuel, model.n, i18n.language)
  const bodies = variantOptions('body', stats.body, model.n, i18n.language)
  // The median engine size describes the typical car; once another fuel is picked it no longer applies.
  const capacity = fuel === (stats.fuel[0]?.[0] ?? null) ? (stats.capacityP50 ?? null) : null

  return (
    <>
      <div className="mb-4 space-y-2 border-b border-[var(--color-border)] pb-4">
        <p className="text-sm text-[var(--color-muted)]">{t('catalog.pickHint')}</p>
        <VariantChipRow
          title={t('catalog.pickYear')}
          chips={variantYears(stats.years, model.n).map(y => ({
            key: String(y),
            label: String(y),
            active: y === year,
            onPick: () => setYear(y)
          }))}
        />
        <VariantChipRow
          title={t('catalog.pickGeneration')}
          chips={generations.map(g => ({
            key: `${g.code}-${g.yearFrom}`,
            label: `${generationLabel(g, t)} · ${generationSpanText(g, t)} · ${formatCount(carsInSpan(stats.years, g))}`,
            active: g === currentGeneration,
            onPick: () => setYear(yearInSpan(stats.years, g))
          }))}
        />
        <VariantChipRow
          title={t('catalog.fuel')}
          chips={fuels.map(o => ({
            key: o.value,
            label: o.label,
            active: o.value === fuel,
            onPick: () => setFuel(o.value)
          }))}
        />
        <VariantChipRow
          title={t('catalog.body')}
          chips={bodies.map(o => ({
            key: o.value,
            label: o.label,
            active: o.value === body,
            onPick: () => setBody(o.value)
          }))}
        />
        {year !== null && (
          <CompareChip
            from={{
              kind: 'model',
              make: model.make,
              model: model.model,
              year,
              fuel: resolveFuelCategories(fuel)[0] ?? null
            }}
          />
        )}
      </div>

      {!!currentGeneration && !!byYear && (
        <GenerationStats
          name={generationLabel(currentGeneration, t)}
          span={currentGeneration}
          byYear={byYear}
          modelTotal={model.n}
        />
      )}

      <ModelSections
        brand={model.topBrand}
        model={model.topModel}
        year={year}
        kind={model.kind}
        fuel={fuel}
        capacity={capacity}
        body={body}
      />
    </>
  )
}
