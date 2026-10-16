import { isVin, lookupWmi, vinCheckDigitOk } from '@carplates/shared'

import { resolveYear, splitVin, YEAR_CODES } from '@/components/vin/helpers'
import type { VinSegment } from '@/components/vin/types'

export const EXAMPLE_VIN = 'KMHD350H6GU123456'

export type VinReading = {
  vin: string
  segments: VinSegment[]
  /** From the 3-character WMI; null when the table does not list it. */
  make: string | null
  /** ISO 3166-1 alpha-2 of the country block. */
  country: string | null
  /** Latest plausible model year of the position-10 code (the VIN does not say which 30-year cycle). */
  year: number | null
  checkOk: boolean
}

/** A typed VIN without spaces or dashes, upper-cased. */
export const cleanVin = (input: string): string => input.replace(/[\s-]+/g, '').toUpperCase()

/** What a typed VIN says on its own (no registry, no NHTSA); null until it is a well-formed 17-character VIN. */
export function readVin(input: string, now = new Date().getFullYear()): VinReading | null {
  const vin = cleanVin(input)
  const segments = isVin(vin) ? splitVin(vin) : null
  if (!segments) return null
  const wmi = lookupWmi(vin)
  return {
    vin,
    segments,
    make: wmi?.make ?? null,
    country: wmi?.country ?? null,
    year: resolveYear(vin[9] ?? '', undefined, now),
    checkOk: vinCheckDigitOk(vin)
  }
}

export type YearCodeRow = { code: string; year: number }

/** Position-10 codes of the current 30-year cycle (A = 2010 … 9 = 2039), in order. */
export const yearCodeRows = (): YearCodeRow[] => [...YEAR_CODES].map((code, i) => ({ code, year: 2010 + i }))
