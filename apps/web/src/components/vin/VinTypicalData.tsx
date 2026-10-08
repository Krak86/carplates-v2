import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import FuelEconomy from '@/components/FuelEconomy'
import RdwSpecs from '@/components/RdwSpecs'
import VdbChips from '@/components/VdbChips'
import { typicalLookup } from '@/components/vin/helpers'
import type { FieldMap, VinFallback } from '@/components/vin/helpers'

type Props = {
  fields: FieldMap
  fallback: VinFallback
}

/**
 * Model-level data (NL register specs, cross-market chips, emissions) for the VIN's make / model / year. None of it is
 * decoded from this VIN, so the whole group carries a dashed "≈ typical" tag — the same visual language as the
 * fallback tags — and says when the make / model / year it was looked up by were estimates themselves.
 */
export default function VinTypicalData({ fields, fallback }: Props): ReactNode {
  const { t } = useTranslation()
  const lookup = typicalLookup(fields, fallback)
  if (!lookup) return null

  const { brand, model, year, kind, fuel, capacity, inputSources } = lookup

  return (
    <div className="mt-4">
      <div className="rounded-md border border-dashed border-[var(--color-border)] px-2.5 py-1.5 text-sm">
        <p className="font-medium">
          <span className="mr-1.5 rounded-full border border-dashed border-[var(--color-border)] px-1.5 py-px text-xs font-normal text-[var(--color-muted)]">
            ≈ {t('vin.typical.label')}
          </span>
          {t('vin.typical.title', { name: `${brand} ${model}` })}
        </p>
        <p className="mt-0.5 text-[var(--color-muted)]">{t('vin.typical.why')}</p>
        {inputSources.length > 0 && (
          <p className="mt-0.5 text-[var(--color-muted)]">
            {t('vin.typical.inputs', { sources: inputSources.map(s => t(`vin.derived.${s}.label`)).join(', ') })}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1.5 empty:hidden">
          <VdbChips brand={brand} model={model} kind={kind} />
        </div>
      </div>

      <RdwSpecs brand={brand} model={model} year={year} kind={kind} fuel={fuel} />
      <FuelEconomy brand={brand} model={model} year={year} fuel={fuel} capacity={capacity} kind={kind} />
    </div>
  )
}
