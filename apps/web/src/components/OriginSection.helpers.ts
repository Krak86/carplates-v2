import type { TFunction } from 'i18next'
import { countryAtYear, hasImportOperation } from '@carplates/shared'
import type { OriginResponse } from '@carplates/shared'

export type OriginOwner = {
  name: string
  /** null = since the beginning / ongoing. */
  from: number | null
  to: number | null
}

export type OriginPlantAlt = {
  country: string
  city: string | null
  from: number | null
  to: number | null
  source: string
}

export type OriginStep =
  | {
      kind: 'brand'
      country: string
      /** ZAZ / LuAZ: the flag is the USSR's but the text says Ukrainian SSR. */
      ukrainianSsr: boolean
      foundedYear: number | null
      hqCity: string | null
      source: string
    }
  | { kind: 'ownership'; owners: OriginOwner[]; source: string | null }
  | {
      kind: 'assembly'
      country: string
      city: string | null
      /** `nhtsa` = decoded plant of this VIN, `wmi` = country of the VIN prefix only. */
      via: 'nhtsa' | 'wmi'
      alsoBuiltIn: OriginPlantAlt[]
    }
  | { kind: 'ukraine'; date: string | null; imported: boolean }

export type OriginUkraine = {
  /** First registration date (as the registry prints it) or null when unknown. */
  date: string | null
  imported: boolean
}

export type OriginView = {
  steps: OriginStep[]
  /** The VIN prefix names a different maker than the registry brand. */
  makerMismatch: string | null
  northAmericaVin: boolean
  /** Brand country and plant country differ (both as of the car's year). */
  assemblyDiffers: boolean
  asOf: string | null
}

type Dated = { fromYear: number; toYear?: number | null }

/** The row in force in `year`; with no year, the most recent. Mirrors the API's `pickByYear`. */
function pickByYear<T extends Dated>(rows: readonly T[], year: number | null | undefined): T | null {
  if (rows.length === 0) return null
  const sorted = [...rows].sort((a, b) => a.fromYear - b.fromYear)
  if (year == null) return sorted[sorted.length - 1] ?? null
  const hit = sorted.find(r => r.fromYear <= year && (r.toYear == null || year <= r.toYear))
  if (hit) return hit
  const started = sorted.filter(r => r.fromYear <= year)
  return started[started.length - 1] ?? sorted[0] ?? null
}

/** Brands whose Soviet-era country is the Ukrainian SSR (ORIGIN_PLAN.md). */
const UKRAINIAN_SSR_BRANDS = ['zaz', 'luaz']

const nonZero = (year: number | null | undefined): number | null => (year ? year : null)

/** NHTSA writes plant cities in capitals ("GEORGETOWN"); mixed-case names from the curated data are left as they are. */
export function plantCity(city: string | null | undefined): string | null {
  if (!city) return null
  if (city !== city.toUpperCase()) return city
  return city.toLowerCase().replace(/(^|[\s-])\p{L}/gu, m => m.toUpperCase())
}

/**
 * The chronological steps of a vehicle's origin, each present only when known. Countries are resolved for the car's
 * model year (a 1985 Skoda is Czechoslovak); an unknown year keeps the modern country.
 */
export function buildOriginView(
  data: OriginResponse | undefined,
  year: number | null | undefined,
  ukraine: OriginUkraine | null
): OriginView {
  const view: OriginView = {
    steps: [],
    makerMismatch: data?.hints?.makerMismatch?.wmiMaker ?? null,
    northAmericaVin: !!data?.hints?.northAmericaVin,
    assemblyDiffers: !!data?.hints?.assemblyDiffers,
    asOf: data?.brand?.asOf ?? null
  }
  if (!data) return view

  const period = pickByYear(data.brand?.periods ?? [], year)
  if (period) {
    view.steps.push({
      kind: 'brand',
      country: countryAtYear(period.countryCode, year),
      ukrainianSsr: period.countryCode === 'SU' && UKRAINIAN_SSR_BRANDS.includes(data.brand?.slug ?? ''),
      foundedYear: nonZero(period.foundedYear),
      hqCity: period.hqCity || null,
      source: period.source
    })
  }

  const ownership = [...(data.brand?.ownership ?? [])].sort((a, b) => a.fromYear - b.fromYear)
  if (ownership.length > 0) {
    view.steps.push({
      kind: 'ownership',
      owners: ownership.map(o => ({ name: o.ownerName, from: nonZero(o.fromYear), to: nonZero(o.toYear) })),
      source: ownership[0]?.source ?? null
    })
  }

  if (data.plant) {
    view.steps.push({
      kind: 'assembly',
      country: countryAtYear(data.plant.countryCode, year),
      city: plantCity(data.plant.city),
      via: data.plant.source,
      alsoBuiltIn: (data.modelPlants ?? []).map(p => ({
        country: countryAtYear(p.countryCode, year ?? p.fromYear),
        city: p.city || null,
        from: nonZero(p.fromYear),
        to: nonZero(p.toYear),
        source: p.sourceUrl
      }))
    })
  }

  // A registration alone is not an origin fact: only append it when something above is known.
  if (view.steps.length > 0 && ukraine) {
    view.steps.push({ kind: 'ukraine', date: ukraine.date, imported: ukraine.imported })
  }

  return view
}

export type OriginChipData = {
  brand: { country: string; ukrainianSsr: boolean } | null
  /** Current owner, only when its country is known and differs from the brand's. */
  owner: { name: string; country: string } | null
  plant: { country: string; city: string | null } | null
}

/** The flags of the header chip: brand home, owner when it is from elsewhere, assembly plant. Null when nothing is known. */
export function buildOriginChip(
  data: OriginResponse | undefined,
  year: number | null | undefined
): OriginChipData | null {
  const view = buildOriginView(data, year, null)
  const brandStep = view.steps.find(step => step.kind === 'brand')
  const assemblyStep = view.steps.find(step => step.kind === 'assembly')
  const brand =
    brandStep?.kind === 'brand' ? { country: brandStep.country, ukrainianSsr: brandStep.ukrainianSsr } : null
  const plant = assemblyStep?.kind === 'assembly' ? { country: assemblyStep.country, city: assemblyStep.city } : null

  const modernBrandCode = pickByYear(data?.brand?.periods ?? [], year)?.countryCode
  const picked = pickByYear(data?.brand?.ownership ?? [], year)
  // pickByYear falls back to the nearest earlier row: an owner that had already left before the car's year is not its owner.
  const currentOwner =
    picked && (year == null || picked.toYear == null || picked.toYear === 0 || year <= picked.toYear) ? picked : null
  const owner =
    currentOwner?.ownerCountry && currentOwner.ownerCountry !== modernBrandCode
      ? { name: currentOwner.ownerName, country: countryAtYear(currentOwner.ownerCountry, year) }
      : null

  if (!brand && !owner && !plant) return null
  return { brand, owner, plant }
}

/** Short readable name of a source URL: "Wikidata", else the host. */
export function sourceLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return host.endsWith('wikidata.org') ? 'Wikidata' : host.endsWith('wikipedia.org') ? 'Wikipedia' : host
  } catch {
    return url
  }
}

/** "2005 - 2010", "since 1991", "until 2005" or '' when the owner has no dates. */
export function ownerRange(owner: OriginOwner, t: TFunction): string {
  const { from, to } = owner
  if (from && to) return t('origin.owner.range', { from, to })
  if (from) return t('origin.owner.since', { from })
  if (to) return t('origin.owner.until', { to })
  return ''
}

type RegistryAction = { dReg: string | null; operCode: number | null; operName?: string | null }

/** The Ukraine step from registry actions (newest first): first registration date and whether it was a used import. */
export function ukraineFromActions(actions: readonly RegistryAction[], everImported = false): OriginUkraine | null {
  if (actions.length === 0) return null
  return { date: actions[actions.length - 1]?.dReg ?? null, imported: everImported || hasImportOperation(actions) }
}
