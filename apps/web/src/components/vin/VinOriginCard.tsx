import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { countryFlag } from '@/components/vin/helpers'
import type { FieldMap } from '@/components/vin/helpers'

type Props = {
  fields: FieldMap
}

/** Where the car was built: flag, plant city/country and the manufacturer, with a map link. */
export default function VinOriginCard({ fields }: Props): ReactNode {
  const { t } = useTranslation()
  const city = fields.get('Plant City')
  const country = fields.get('Plant Country')
  const manufacturer = fields.get('Manufacturer Name')
  if (!city && !country && !manufacturer) return null

  const place = [city, country].filter(Boolean).join(', ')
  const mapUrl = place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}` : null

  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="text-4xl leading-none">
        {countryFlag(country) ?? '🌍'}
      </span>

      <div className="min-w-0 flex-1">
        {place && <div className="font-semibold">{place}</div>}
        {manufacturer && <div className="text-sm text-[var(--color-muted)]">{manufacturer}</div>}
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
