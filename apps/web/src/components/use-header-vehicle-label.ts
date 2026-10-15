import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import { classifyQuery } from '@carplates/shared'

import { extractVehicleInfo } from '@/components/VinResult.helpers'
import { ROUTE_TITLE_KEYS } from '@/hooks/useDocumentTitle'
import { plateQuery, vinQuery } from '@/lib/queries'

const withYear = (car: string, year: number | null): string => (car ? `${car}${year ? ` (${year})` : ''}` : '')

/**
 * Vehicle label for the sticky header, mirroring the brand/model/year + plate or VIN already
 * shown in the result card, so identity stays visible once the page is scrolled past it. Reads
 * off the query cache SearchRoute already populated for the current URL — no extra fetch.
 */
export type HeaderVehicleLabel = { text: string; brand: string | null }

export function useHeaderVehicleLabel(): HeaderVehicleLabel | null {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)
  const raw = segments.length === 1 && !(pathname in ROUTE_TITLE_KEYS) ? decodeURIComponent(segments[0] as string) : ''
  const kind = raw ? classifyQuery(raw) : null

  const plate = useQuery({ ...plateQuery(raw), enabled: kind === 'plate' })
  const vin = useQuery({ ...vinQuery(raw), enabled: kind === 'vin' })

  if (kind === 'plate' && plate.isSuccess) {
    const c = plate.data.current
    const car = withYear([c.brand, c.model].filter(Boolean).join(' '), c.makeYear)
    return { text: [car || null, plate.data.plate].filter(Boolean).join(' '), brand: c.brand ?? null }
  }

  if (kind === 'vin' && vin.isSuccess) {
    const { brand, model, year } = extractVehicleInfo(vin.data)
    const car = withYear([brand, model].filter(Boolean).join(' '), year)
    return { text: [car || null, vin.data.vin].filter(Boolean).join(' '), brand: brand ?? null }
  }

  return null
}
