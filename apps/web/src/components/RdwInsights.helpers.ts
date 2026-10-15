import type { RdwSpecs } from '@carplates/shared'

import { kwToHp, type OwnFigures } from '@/components/RdwSpecs.helpers'

/** Mass of the driver RDW adds to a kerb mass, and the mass the towing / payload sliders use per adult. */
export const DRIVER_KG = 75
export const ADULT_KG = 75

/** Peak output of a galloping horse is ~15 hp; the 1 hp of the unit is a sustained, much gentler figure. */
const HORSE_PEAK_HP = 15
/** A cyclist sustains ~100 W, an electric kettle draws ~2 kW. */
const PERSON_KW = 0.1
const KETTLE_KW = 2

export type PowerEquivalents = { horses: number; people: number; kettles: number }

/** What `kw` of engine power is worth in horses (peak), pedalling people and kettles — fun, order-of-magnitude figures. */
export const powerEquivalents = (kw: number): PowerEquivalents => ({
  horses: Math.max(1, Math.round(kwToHp(kw) / HORSE_PEAK_HP)),
  people: Math.round(kw / PERSON_KW),
  kettles: Math.max(1, Math.round(kw / KETTLE_KW))
})

/** Horsepower per tonne of kerb mass — the honest performance metric (a bigger engine in a heavier car is not quicker). */
export const hpPerTonne = (kw: number, massKg: number): number => Math.round((kwToHp(kw) / massKg) * 1000)

/**
 * Rough 0-100 km/h time in seconds from the mass-to-power ratio, rounded to half a second. Fitted to a handful of
 * well-known cars (Golf 1.4 TSI ≈ 9.5 s, Model 3 LR ≈ 4.4 s, 911 Turbo ≈ 2.8 s): an estimate, off by a second or so.
 */
export const estimateZeroTo100 = (kw: number, massKg: number): number =>
  Math.round(0.78 * (massKg / kw) ** 0.95 * 2) / 2

/** Speeds people know, slowest first, in km/h (a sprinter, a racehorse, a cheetah, an Intercity train, a Shinkansen). */
export const SPEED_ANCHORS = [
  { key: 'bolt', kmh: 45, icon: '🏃' },
  { key: 'horse', kmh: 70, icon: '🐎' },
  { key: 'cheetah', kmh: 110, icon: '🐆' },
  { key: 'train', kmh: 160, icon: '🚆' },
  { key: 'shinkansen', kmh: 320, icon: '🚄' }
] as const
export type SpeedAnchor = (typeof SPEED_ANCHORS)[number]

/** Ukrainian speed limits (km/h) for a passenger car: residential zone, built-up area, country road, dual carriageway, motorway. */
export const UA_SPEED_LIMITS = [20, 50, 90, 110, 130] as const

/** Kyiv - Lviv road distance, km — the trip the speed gauge is read against. */
export const KYIV_LVIV_KM = 540

export type SpeedRank = { slower: SpeedAnchor | null; faster: SpeedAnchor | null }

/** The fastest anchor the car beats and the slowest it does not. */
export function rankSpeed(kmh: number): SpeedRank {
  const beaten = SPEED_ANCHORS.filter(a => a.kmh <= kmh)
  return {
    slower: beaten.at(-1) ?? null,
    faster: SPEED_ANCHORS.find(a => a.kmh > kmh) ?? null
  }
}

/** "4 h 10 min" parts for driving `km` at `kmh`. */
export function tripTime(km: number, kmh: number): { hours: number; minutes: number } {
  const total = Math.round((km / kmh) * 60)
  return { hours: Math.floor(total / 60), minutes: total % 60 }
}

/** Mass the car carries empty, kg: the registry's own mass (+ driver) when recorded, else RDW's kerb mass, else unladen + driver. */
export function kerbMassOf(specs: RdwSpecs, own: OwnFigures | undefined): number | null {
  if (own?.massKg) return own.massKg + DRIVER_KG
  if (specs.kerbMassKg) return Math.round(specs.kerbMassKg.median)
  return specs.massKg ? Math.round(specs.massKg.median) + DRIVER_KG : null
}

/** Permitted gross mass, kg: the registry's figure for this car, else RDW's median. */
export const grossMassOf = (specs: RdwSpecs, own: OwnFigures | undefined): number | null =>
  own?.grossMassKg || (specs.grossMassKg ? Math.round(specs.grossMassKg.median) : null)

/** What the car may carry on top of its kerb mass (driver included in the kerb), kg; null when either mass is unknown. */
export function payloadKg(gross: number | null, kerb: number | null): number | null {
  if (!gross || !kerb || gross <= kerb) return null
  return gross - kerb
}

/** Kg the chosen load uses: the adults beyond the driver plus luggage. */
export const loadKg = (adults: number, luggageKg: number): number => Math.max(0, adults - 1) * ADULT_KG + luggageKg

export const TRAILER_PRESETS = [
  { key: 'light', kg: 400, icon: '🧳' },
  { key: 'utility', kg: 750, icon: '🛻' },
  { key: 'boat', kg: 1000, icon: '🚤' },
  { key: 'caravan', kg: 1300, icon: '🏕️' },
  { key: 'caravanBig', kg: 1800, icon: '🚐' },
  { key: 'horse', kg: 2200, icon: '🐴' }
] as const
export type TrailerPreset = (typeof TRAILER_PRESETS)[number]

export type TowVerdict = 'any' | 'braked' | 'no'

/** Whether a trailer of `trailerKg` fits: within the unbraked limit (any trailer), the braked limit (needs its own brakes) or neither. */
export function towVerdict(trailerKg: number, unbraked: number | null, braked: number | null): TowVerdict {
  if (unbraked !== null && trailerKg <= unbraked) return 'any'
  if (braked !== null && trailerKg <= braked) return 'braked'
  return 'no'
}

/** Caravan-club rule of thumb: keep the loaded caravan at or under 85 % of the car's kerb mass. */
export const caravanAdvice = (kerb: number): number => Math.round((kerb * 0.85) / 10) * 10

export type LicenceCategory = 'B' | 'BE' | 'C1' | 'C1E' | 'C' | 'CE'

/**
 * Licence category for a car of permitted gross mass `carGross` kg pulling a trailer of `trailerGross` kg: B up to 3.5 t
 * (with a trailer up to 750 kg, or any trailer keeping the train within 3.5 t), BE for a trailer up to 3.5 t, then the
 * C classes. Summary of the Ukrainian categories — the rules text of the card points at the source.
 */
export function licenceFor(carGross: number, trailerGross: number): LicenceCategory {
  if (carGross <= 3500) {
    if (trailerGross <= 750 || carGross + trailerGross <= 3500) return 'B'
    return trailerGross <= 3500 ? 'BE' : 'CE'
  }
  if (carGross <= 7500) return trailerGross <= 750 ? 'C1' : 'C1E'
  return trailerGross <= 750 ? 'C' : 'CE'
}

/** Tax Code 215.3.5-1: base excise rate per vehicle, euros — spark-ignition up to / over 3,000 cm³, diesel up to / over 3,500 cm³. */
const EXCISE_BASE_EUR = { petrol: [50, 100], diesel: [75, 150] } as const
const EXCISE_PETROL_LIMIT_CC = 3000
const EXCISE_DIESEL_LIMIT_CC = 3500
export const EXCISE_MAX_AGE = 15

export type ExciseEngine = 'petrol' | 'diesel'

/**
 * Which excise row a registry fuel falls under: diesel only when it is not also petrol; petrol (gas conversions
 * included) otherwise; null for electric, hydrogen, gas-only and hybrid plug-ins — their rates are not modelled.
 */
export function exciseEngine(categories: readonly string[]): ExciseEngine | null {
  if (categories.some(c => c === 'electric' || c === 'hydrogen')) return null
  if (categories.includes('petrol')) return 'petrol'
  return categories.includes('diesel') ? 'diesel' : null
}

/** Age factor of the excise formula: full years of use, at least 1 (new) and at most 15. */
export const exciseAge = (makeYear: number, currentYear: number): number =>
  Math.min(EXCISE_MAX_AGE, Math.max(1, currentYear - makeYear))

/** Import excise of a used car in euros: base rate × (cc / 1000) × age, rounded to whole euros. */
export function exciseEur(engine: ExciseEngine, cc: number, age: number): number {
  const [low, high] = EXCISE_BASE_EUR[engine]
  const limit = engine === 'petrol' ? EXCISE_PETROL_LIMIT_CC : EXCISE_DIESEL_LIMIT_CC
  return Math.round((cc <= limit ? low : high) * (cc / 1000) * age)
}
