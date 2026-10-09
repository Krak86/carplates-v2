import { z } from 'zod'

/** min / median / max of one measure over the Dutch vehicles of a make/model/year; null when RDW gave none. */
const rangeSchema = z.object({ min: z.number(), median: z.number(), max: z.number() }).nullable()

/**
 * Stage C2 measures. `optional` as well as nullable: an offline-cached answer from before C2 has no such key at all
 * (the persisted cache is rehydrated without re-parsing), so readers use `?? null`.
 */
const extraRangeSchema = rangeSchema.optional()

/**
 * A categorical measure (fuel mix, colours, body types, energy labels): the share of the vehicles that have the
 * attribute, largest first. `key` is the RDW-side class or value ("hybrid", "GRIJS", "hatchback", "B"); the web
 * translates it. Same `optional` rule as `extraRangeSchema`.
 */
const shareListSchema = z
  .array(z.object({ key: z.string(), share: z.number() }))
  .nullable()
  .optional()

/** One make/model/year aggregate of RDW's open register (CC0). */
export const rdwSpecsSchema = z.object({
  /** Year of first registration in the Netherlands — close to the model year, but imports run later. */
  year: z.number().int(),
  /** How many Dutch-registered vehicles the figures are taken from. */
  n: z.number().int(),
  powerKw: rangeSchema,
  displacementCc: rangeSchema,
  /** Unladen mass (massa ledig voertuig), kg. */
  massKg: rangeSchema,
  /** Combined CO2, g/km — WLTP where the vehicle has it, else the older NEDC figure. */
  co2GKm: rangeSchema,
  /** Permitted maximum (gross) mass, kg — unladen mass plus the load. */
  grossMassKg: extraRangeSchema,
  /** Wheelbase, cm. */
  wheelbaseCm: extraRangeSchema,
  seats: extraRangeSchema,
  doors: extraRangeSchema,
  /** Maximum towed mass with / without trailer brakes, kg. */
  towBrakedKg: extraRangeSchema,
  towUnbrakedKg: extraRangeSchema,
  /**
   * Outer dimensions, cm, and top speed, km/h. RDW fills these for only a third of the cars, so the figures cover
   * the vehicles that have them; the API drops one built from fewer than `RDW_MIN_DISPLAY_N` vehicles.
   */
  lengthCm: extraRangeSchema,
  widthCm: extraRangeSchema,
  heightCm: extraRangeSchema,
  topSpeedKmh: extraRangeSchema,
  /**
   * Stage C3. New list price in the NETHERLANDS, euros — includes 21 % VAT and BPM (Dutch registration tax), so it is
   * neither a Ukrainian price nor a resale value; `priceExTaxEur` is price / 1.21 - BPM.
   */
  priceEur: extraRangeSchema,
  priceExTaxEur: extraRangeSchema,
  /** BPM (Dutch registration tax) inside the price; absent for the exempt (electric) cars. */
  bpmEur: extraRangeSchema,
  /** Kerb mass (massa rijklaar: unladen plus a 75 kg driver), kg. */
  kerbMassKg: extraRangeSchema,
  cylinders: extraRangeSchema,
  /** Combined consumption, l/100 km (WLTP where the vehicle has it). */
  consumptionL100: extraRangeSchema,
  /** Electric consumption, kWh/100 km, and range, km — battery-electric cars only. */
  evKwh100: extraRangeSchema,
  evRangeKm: extraRangeSchema,
  /** Pass-by noise, dB. */
  noiseDb: extraRangeSchema,
  /** Share of the vehicles per fuel class: petrol, diesel, ev, hev (non-plug-in hybrid), phev, gas. */
  fuelMix: shareListSchema,
  /** Top colours (Dutch names, GRIJS …) and body types (RDW names, hatchback …); the Dutch energy label A-G. */
  colours: shareListSchema,
  bodyTypes: shareListSchema,
  energyLabels: shareListSchema,
  /**
   * Share (0-1) of the Dutch vehicles of this model-year with an open recall campaign when the register was read. A
   * statistic about the model in the Netherlands — never a statement about a particular car.
   */
  openRecallShare: z.number().nullable().optional()
})
export type RdwSpecs = z.infer<typeof rdwSpecsSchema>

/**
 * GET /api/rdw — what the Dutch vehicle register (RDW open data, CC0) says about a registry make/model/year:
 * power, displacement, mass and CO2. EU-spec data, so it may differ from a Ukrainian-market build. Own file, not
 * `schemas.ts`, so adding it does not bust users' offline caches.
 */
export const rdwMatchSchema = z.object({
  makeName: z.string(),
  modelName: z.string(),
  /** How the registry model reached the RDW model — "prefix"/"series" are looser than "exact". */
  how: z.enum(['exact', 'alias', 'series', 'prefix']),
  /** RDW files the model under another make than the registry (Renault Dokker = Dacia Dokker). */
  crossMake: z.boolean(),
  /** False when the asked year has no data and the nearest year within the allowed gap is shown. */
  exactYear: z.boolean(),
  specs: rdwSpecsSchema,
  /**
   * Stage C4. Median Dutch NEW price by model year (euros, rounded to 100) for the matched model — real RDW data; years
   * with a small sample are left out. Optional like `extraRangeSchema`: older offline-cached answers lack it.
   */
  priceByYear: z
    .array(z.object({ year: z.number().int(), priceEur: z.number() }))
    .nullable()
    .optional(),
  /**
   * Stage C4. Median Dutch NEW price per fuel class of the matched model-year (euros, rounded to 100) with the priced
   * vehicle count; most vehicles first. Thin classes are kept (the UI dims them). Optional: older caches lack it.
   */
  priceByFuel: z
    .array(z.object({ fuel: z.string(), priceEur: z.number(), n: z.number().int() }))
    .nullable()
    .optional(),
  /**
   * Stage C4. Rough value: Dutch new price x the BPM depreciation curve (`rdwValue.ts`) for the asked year, as a rounded
   * range. An assumption on top of EU list prices — not a market price, never a Ukrainian one. Null when the model has
   * no price at all or the curve has no value for the age. A price from fewer than `RDW_MIN_DISPLAY_N` vehicles is still
   * used but flagged `rough` (the UI warns), unlike the Specs price row, which is hidden then.
   */
  valueEstimate: z
    .object({
      ageYears: z.number().int(),
      retained: z.number(),
      /** Past the end of the depreciation table: the old-car floor was used (very rough). Optional for old caches. */
      extrapolated: z.boolean().optional(),
      midEur: z.number(),
      lowEur: z.number(),
      highEur: z.number(),
      /** Half-width (0-1) of the range around `midEur`; it widens with age (`rangeSpread`). Optional for old caches. */
      spread: z.number().optional(),
      /** The median new price the estimate starts from (euros) and how many vehicles gave it. */
      newPriceEur: z.number().optional(),
      priceN: z.number().int().optional(),
      rough: z.boolean().optional()
    })
    .nullable()
    .optional()
})
export type RdwMatchInfo = z.infer<typeof rdwMatchSchema>

export const rdwResponseSchema = z.object({
  brand: z.string(),
  model: z.string(),
  year: z.number().int(),
  match: rdwMatchSchema.nullable()
})
export type RdwResponse = z.infer<typeof rdwResponseSchema>
