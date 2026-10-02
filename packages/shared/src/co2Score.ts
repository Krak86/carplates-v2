/** Tailpipe CO2 at or above which the 0-100 score saturates. Tune against the real matched distribution. */
export const CO2_SCORE_MAX_G_KM = 300

export const CO2_BANDS = ['green', 'yellow', 'orange', 'red'] as const
export type Co2Band = (typeof CO2_BANDS)[number]

/** Upper score bound (exclusive) of each band except the last; the score is 0 = clean, 100 = worst. */
const CO2_BAND_LIMITS: ReadonlyArray<{ band: Co2Band; below: number }> = [
  { band: 'green', below: 25 },
  { band: 'yellow', below: 50 },
  { band: 'orange', below: 75 }
]

/** One US gallon-mile → km conversion: EPA reports CO2 in g/mile. */
export const KM_PER_MILE = 1.609344

export function gramsPerMileToGramsPerKm(gPerMile: number): number {
  return gPerMile / KM_PER_MILE
}

/** Linear 0-100 on tailpipe CO2 g/km, clamped. Pure EV (0 g/km) → 0. Null for a missing/invalid value. */
export function co2Score(gPerKm: number | null | undefined): number | null {
  if (gPerKm == null || !Number.isFinite(gPerKm) || gPerKm < 0) return null
  return Math.round(Math.min(gPerKm / CO2_SCORE_MAX_G_KM, 1) * 100)
}

export function co2Band(score: number): Co2Band {
  return CO2_BAND_LIMITS.find(l => score < l.below)?.band ?? 'red'
}
