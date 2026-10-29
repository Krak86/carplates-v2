import { REGIONS, REGION_NAMES, brandLogoUrl, type StatsTopResponse } from '@carplates/shared'

export const ROUND_COUNT = 10
const OPTION_COUNT = 4

/** The twelve Cyrillic letters a plate may use (the ones that look like a Latin letter). */
const PLATE_LETTERS = 'АВЕІКМНОРСТХ'

type Rng = () => number

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j] as T, copy[i] as T]
  }
  return copy
}

const pick = <T>(items: readonly T[], rng: Rng): T => items[Math.floor(rng() * items.length)] as T

export type RegionRound = { plate: string; region: string }

/** A made-up plate (normalized, Cyrillic) that `regionName()` maps back to `region`; the region's own prefix list is `REGIONS`. */
export function plateForRegion(region: string, rng: Rng = Math.random): string {
  const prefixes = Object.entries(REGIONS)
    .filter(([, name]) => name === region)
    .map(([prefix]) => prefix)
  const digits = Array.from({ length: 4 }, () => Math.floor(rng() * 10)).join('')
  const suffix = pick(Array.from(PLATE_LETTERS), rng) + pick(Array.from(PLATE_LETTERS), rng)
  return `${pick(prefixes, rng)}${digits}${suffix}`
}

/** `count` plates of distinct regions (all 27 are on the map). */
export function buildRegionRounds(count = ROUND_COUNT, rng: Rng = Math.random): RegionRound[] {
  return shuffle(REGION_NAMES, rng)
    .slice(0, count)
    .map(region => ({ region, plate: plateForRegion(region, rng) }))
}

export type LogoRound = { answer: string; options: string[] }

/** Brands that have a bundled logo, from the leaderboard. */
export function logoBrands(stats: Pick<StatsTopResponse, 'byBrand'>): string[] {
  return stats.byBrand.map(row => row.value).filter((brand): brand is string => !!brand && !!brandLogoUrl(brand))
}

/** One round per brand (up to `count`): the logo of `answer` among `OPTION_COUNT` shuffled brand names. */
export function buildLogoRounds(brands: readonly string[], count = ROUND_COUNT, rng: Rng = Math.random): LogoRound[] {
  return shuffle(brands, rng)
    .slice(0, count)
    .map(answer => {
      const others = shuffle(
        brands.filter(b => b !== answer),
        rng
      ).slice(0, OPTION_COUNT - 1)
      return { answer, options: shuffle([answer, ...others], rng) }
    })
}

export type CountItem = {
  key: string
  label: string
  /** Brand whose logo to show (brands and models). */
  brand: string | null
  n: number
}

/** Brands, models and regions of the leaderboards with their registered-car counts. */
export function countItems(stats: Pick<StatsTopResponse, 'byBrand' | 'byRegion' | 'topModels'>): CountItem[] {
  const items: CountItem[] = []
  for (const row of stats.byBrand) {
    if (row.value) items.push({ key: `brand:${row.value}`, label: row.value, brand: row.value, n: row.distinctPlates })
  }
  for (const row of stats.topModels) {
    items.push({
      key: `model:${row.brand} ${row.model}`,
      label: `${row.brand} ${row.model}`,
      brand: row.brand,
      n: row.distinctPlates
    })
  }
  for (const row of stats.byRegion) {
    items.push({ key: `region:${row.region}`, label: row.region, brand: null, n: row.distinctPlates })
  }
  return items
}

/**
 * A chain for "higher or lower": each step compares the item on screen with the next one, and the next becomes the item
 * on screen. Items with the same count as a neighbour are skipped so a step always has one right answer.
 */
export function buildChain(items: readonly CountItem[], rng: Rng = Math.random): CountItem[] {
  const chain: CountItem[] = []
  for (const item of shuffle(items, rng)) {
    if (chain.length && chain[chain.length - 1]?.n === item.n) continue
    chain.push(item)
  }
  return chain
}

export function isHigher(current: CountItem, next: CountItem): boolean {
  return next.n > current.n
}
