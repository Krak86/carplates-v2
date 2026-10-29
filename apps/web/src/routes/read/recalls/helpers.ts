import type { MotResponse } from '@carplates/shared'

type MotMatch = NonNullable<MotResponse['match']>

export type FailPoint = { band: number; failRate: number | null; baselineFailRate: number | null; tests: number }

/** Fail rate per mileage band next to the UK average, in the order of the API's bands. */
export function failCurve(match: MotMatch): FailPoint[] {
  return match.bands.map((b, band) => ({
    band,
    failRate: b.failRate,
    baselineFailRate: b.baselineFailRate,
    tests: b.tests
  }))
}

export type FaultGroup = { code: string; failShare: number; watchShare: number }

/** The `limit` fault groups behind most failed tests of the model, as shares of all its tests. */
export function topFaultGroups(match: MotMatch, limit: number): FaultGroup[] {
  if (match.tests <= 0) return []

  return [...match.groups]
    .sort((a, b) => b.failTests - a.failTests)
    .slice(0, limit)
    .map(g => ({ code: g.code, failShare: g.failTests / match.tests, watchShare: g.watchTests / match.tests }))
}

/** Bar height (0–100) of a share against the chart's top, never below a visible sliver for a real value. */
export function barHeight(share: number | null, top: number): number {
  if (share == null || top <= 0) return 0
  return Math.max(2, Math.min(100, (share / top) * 100))
}

export type BandGroup = { code: string; fail: number; watch: number }

/** The `limit` fault groups with the highest fail share in one mileage band (groups with no figure there are skipped). */
export function groupsAtBand(match: MotMatch, band: number, limit: number): BandGroup[] {
  return match.groups
    .flatMap(g => {
      const fail = g.fail[band]
      return fail == null ? [] : { code: g.code, fail, watch: g.watch[band] ?? 0 }
    })
    .sort((a, b) => b.fail - a.fail)
    .slice(0, limit)
}
