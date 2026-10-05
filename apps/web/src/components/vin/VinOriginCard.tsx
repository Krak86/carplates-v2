import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import VinDerivedChip from '@/components/vin/VinDerivedChip'
import { countryFlag, countryName, isoFlag } from '@/components/vin/helpers'
import type { FieldMap, VinFallback } from '@/components/vin/helpers'

type Props = {
  fields: FieldMap
  fallback: VinFallback
}

/** Where the car was built: flag, plant city/country and the manufacturer, with a map link. Falls back to the VIN prefix's country. */
export default function VinOriginCard({ fields, fallback }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const city = fields.get('Plant City')
  const nhtsaCountry = fields.get('Plant Country')
  const manufacturer = fields.get('Manufacturer Name') ?? fallback.make?.value
  const derivedCountry = nhtsaCountry ? undefined : fallback.country
  if (!city && !nhtsaCountry && !derivedCountry && !manufacturer) return null

  const country = nhtsaCountry ?? (derivedCountry ? countryName(derivedCountry.value, i18n.language) : undefined)
  const place = [city, country].filter(Boolean).join(', ')
  const mapUrl = place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}` : null
  const flag = derivedCountry ? isoFlag(derivedCountry.value) : countryFlag(nhtsaCountry)

  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="text-4xl leading-none">
        {flag ?? '🌍'}
      </span>

      <div className="min-w-0 flex-1">
        {place && (
          <div className="font-semibold">
            {place}
            {derivedCountry && <VinDerivedChip source={derivedCountry.source} />}
          </div>
        )}
        {manufacturer && (
          <div className="text-sm text-[var(--color-muted)]">
            {manufacturer}
            {!fields.get('Manufacturer Name') && fallback.make && <VinDerivedChip source={fallback.make.source} />}
          </div>
        )}
      </div>

      {mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-sm text-[var(--color-primary)] hover:underline"
        >
          📍 {t('vin.origin.map')}
        </a>
      )}
    </div>
  )
}
