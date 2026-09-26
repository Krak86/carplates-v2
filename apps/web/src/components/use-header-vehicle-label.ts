import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import { classifyQuery } from '@carplates/shared'

import { extractVehicleInfo } from '@/components/VinResult.helpers'
import { plateQuery, vinQuery } from '@/lib/queries'

// The other single-segment routes App.tsx matches before falling through to SearchRoute's `/:query`.
const STATIC_ROUTES = new Set(['about', 'history', 'favorites', 'stats'])

const withYear = (car: string, year: number | null): string => (car ? `${car}${year ? ` (${year})` : ''}` : '')

/**
 * Vehicle label for the sticky header, mirroring the brand/model/year + plate or VIN already
 * shown in the result card, so identity stays visible once the page is scrolled past it. Reads
 * off the query cache SearchRoute already populated for the current URL — no extra fetch.
 */
export function useHeaderVehicleLabel(): string | null {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)
  const raw = segments.length === 1 && !STATIC_ROUTES.has(segments[0] as string) ? decodeURIComponent(segments[0] as string) : ''
  const kind = raw ? classifyQuery(raw) : null

  const plate = useQuery({ ...plateQuery(raw), enabled: kind === 'plate' })
  const vin = useQuery({ ...vinQuery(raw), enabled: kind === 'vin' })

  if (kind === 'plate' && plate.isSuccess) {
    const c = plate.data.current
    const car = withYear([c.brand, c.model].filter(Boolean).join(' '), c.makeYear)
    return [car || null, plate.data.plate].filter(Boolean).join(' ')
  }

  if (kind === 'vin' && vin.isSuccess) {
    const { brand, model, year } = extractVehicleInfo(vin.data)
    const car = withYear([brand, model].filter(Boolean).join(' '), year)
    return [car || null, vin.data.vin].filter(Boolean).join(' ')
  }

  return null
}
