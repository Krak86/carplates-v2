import { queryOptions } from '@tanstack/react-query'
import { normalizePlate } from '@carplates/shared'

import { decodeVin, lookupPlate } from '@/lib/api'

export function plateQuery(raw: string) {
  const plate = normalizePlate(raw)
  return queryOptions({ queryKey: ['plate', plate], queryFn: () => lookupPlate(plate) })
}

export function vinQuery(raw: string) {
  const vin = raw.trim().toUpperCase()
  return queryOptions({ queryKey: ['vin', vin], queryFn: () => decodeVin(vin) })
}
