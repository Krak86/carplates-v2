import { queryOptions } from '@tanstack/react-query'
import { normalizePlate } from '@carplates/shared'

import { decodeVin, lookupPlate, plateHistory } from '@/lib/api'
import { listVisits } from '@/lib/history-db'

export function plateQuery(raw: string) {
  const plate = normalizePlate(raw)
  return queryOptions({ queryKey: ['plate', plate], queryFn: () => lookupPlate(plate) })
}

export function plateHistoryQuery(raw: string) {
  const plate = normalizePlate(raw)
  return queryOptions({ queryKey: ['plate', plate, 'history'], queryFn: () => plateHistory(plate) })
}

export function vinQuery(raw: string) {
  const vin = raw.trim().toUpperCase()
  return queryOptions({ queryKey: ['vin', vin], queryFn: () => decodeVin(vin) })
}

export function historyQuery() {
  return queryOptions({ queryKey: ['history'], queryFn: listVisits })
}
