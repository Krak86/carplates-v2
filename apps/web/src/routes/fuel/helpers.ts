import { CO2_SCORE_MAX_G_KM, FUEL_CLASSES, VEHICLE_FUELS, co2Band } from '@carplates/shared'
import type { Co2Band, FuelClass, FuelStatsRow, VehicleFuel } from '@carplates/shared'

/** Bar length (0–100) for an average CO2, on the same g/km scale as the 0–100 score. */
export function barPercent(avgCo2: number | null): number {
  if (avgCo2 == null) return 0
  return Math.max(0, Math.min(100, (avgCo2 / CO2_SCORE_MAX_G_KM) * 100))
}

export function bandForCo2(avgCo2: number): Co2Band {
  return co2Band(barPercent(avgCo2))
}

/** Share (0–100) of a row's cars that have an emissions estimate. */
export function coveragePercent(row: Pick<FuelStatsRow, 'n' | 'matched'>): number {
  return row.n > 0 ? (row.matched / row.n) * 100 : 0
}

/** A 0–100 share with one decimal below 10 % (so 0.4 % stays readable), whole numbers above. */
export function formatPercent(value: number): string {
  if (value > 0 && value < 0.1) return '<0.1%'
  return `${value < 10 ? value.toFixed(1) : Math.round(value)}%`
}

/** Registration years that are real model years — the registry has a few junk values (0, 1900, future years). */
export function plausibleYear(label: string, currentYear: number): boolean {
  const year = Number(label)
  return Number.isInteger(year) && year >= 1960 && year <= currentYear
}

/**
 * The advanced-search `fuel` filter for a fuel class, or null when none matches it. The filter is a substring match
 * on the registry fuel text, so "hybrid" has no filter of its own (electric would also list pure EVs).
 */
export function searchFuelFor(fuelClass: FuelClass): VehicleFuel | null {
  return (VEHICLE_FUELS as readonly string[]).includes(fuelClass) ? (fuelClass as VehicleFuel) : null
}

export const POWERTRAIN_VIEWS = ['models', 'brands', 'rare', 'years'] as const
export type PowertrainView = (typeof POWERTRAIN_VIEWS)[number]
export const DEFAULT_POWERTRAIN_VIEW: PowertrainView = 'models'

/** Reads a `?ptView=` value, falling back to the default for anything unknown. */
export function parsePowertrainView(value: string | null): PowertrainView {
  return (POWERTRAIN_VIEWS as readonly string[]).includes(value ?? '')
    ? (value as PowertrainView)
    : DEFAULT_POWERTRAIN_VIEW
}

/** Reads a `?pt=` value; null for anything that is not a fuel class. */
export function parseFuelClass(value: string | null): FuelClass | null {
  return (FUEL_CLASSES as readonly string[]).includes(value ?? '') ? (value as FuelClass) : null
}
