import { REGIONS, REGION_NAMES, brandLogoUrl, brandSlug, type StatsTopResponse } from '@carplates/shared'

export const ROUND_CHOICES = [10, 20, 30, 50] as const
export type RoundChoice = (typeof ROUND_CHOICES)[number]
export const DEFAULT_ROUNDS: RoundChoice = 10
/** How many of the biggest brands the logo and count games draw from (the long tail is not recognizable). */
const BRAND_POOL = 80
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

/** `count` items: shuffled passes over `items`, so nothing repeats until every item was used once. */
export function cycle<T>(items: readonly T[], count: number, rng: Rng = Math.random): T[] {
  const out: T[] = []
  while (items.length && out.length < count) out.push(...shuffle(items, rng))
  return out.slice(0, count)
}

/** `count` plates, regions in shuffled passes over all 27 (every region once before any repeats). */
export function buildRegionRounds(count: number = DEFAULT_ROUNDS, rng: Rng = Math.random): RegionRound[] {
  return cycle(REGION_NAMES, count, rng).map(region => ({ region, plate: plateForRegion(region, rng) }))
}

export type LogoRound = { answer: string; options: string[] }

export type BrandCount = { brand: string; n: number }

/** Brands with a bundled logo, raw spellings of one logo summed (labelled by the biggest spelling), biggest first, capped at `BRAND_POOL`. */
export function foldBrands(rows: readonly BrandCount[]): BrandCount[] {
  const bySlug = new Map<string, { brand: string; top: number; n: number }>()
  for (const row of rows) {
    const slug = brandSlug(row.brand)
    if (!slug || !brandLogoUrl(row.brand)) continue
    const entry = bySlug.get(slug)
    if (!entry) bySlug.set(slug, { brand: row.brand, top: row.n, n: row.n })
    else {
      entry.n += row.n
      if (row.n > entry.top) Object.assign(entry, { brand: row.brand, top: row.n })
    }
  }
  return [...bySlug.values()]
    .sort((x, y) => y.n - x.n)
    .slice(0, BRAND_POOL)
    .map(({ brand, n }) => ({ brand, n }))
}

export const logoBrands = (rows: readonly BrandCount[]): string[] => foldBrands(rows).map(b => b.brand)

/** `count` rounds (every brand once before any repeats): the logo of `answer` among `OPTION_COUNT` shuffled brand names. */
export function buildLogoRounds(
  brands: readonly string[],
  count: number = DEFAULT_ROUNDS,
  rng: Rng = Math.random
): LogoRound[] {
  return cycle(brands, count, rng).map(answer => {
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

/** Brands, models and regions with their registered-car counts. */
export function countItems(
  brands: readonly BrandCount[],
  top: Pick<StatsTopResponse, 'byRegion' | 'topModels'>
): CountItem[] {
  const items: CountItem[] = foldBrands(brands).map(({ brand, n }) => ({
    key: `brand:${brand}`,
    label: brand,
    brand,
    n
  }))
  for (const row of top.topModels) {
    items.push({
      key: `model:${row.brand} ${row.model}`,
      label: `${row.brand} ${row.model}`,
      brand: row.brand,
      n: row.distinctPlates
    })
  }
  for (const row of top.byRegion) {
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
