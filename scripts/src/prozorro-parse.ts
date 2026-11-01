import type { ProzorroAuctionInsert } from '@carplates/db'
import { denormalizePlate, isVin, normalizePlate } from '@carplates/shared'
import { z } from 'zod'

import { lotRegion, titleMakeModel, titlePlate, titleYear } from './auctions-parse.js'

// ---------------------------------------------------------------------------------------------------------------------
// Prozorro.Sale auction feed (https://procedure.prozorro.sale/api/search/byDateModified/<date>) → registry.prozorro_auctions.
// The feed is a bare array of full auction objects keyed `auctionId`. Everything below the key fields is optional: lots of
// other kinds (land, leases, claims) share the feed, and even vehicle lots carry a different subset of `itemProps`.
// See docs/prozorro-sale-auctions-plan.md.
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Bank sellers by EDRPOU → name. Data, not logic: extend when the backfill report ("seller names containing БАНК") shows another
 * bank selling vehicles. Tags `npl` / `privatbank` catch the rest.
 */
export const BANK_EDRPOU: Readonly<Record<string, string>> = {
  '00032129': 'Ощадбанк',
  '23697280': 'Укргазбанк',
  '23494714': 'Sense Bank',
  '14305909': 'Raiffeisen Bank',
  '00032112': 'Укрексімбанк',
  '14360570': 'ПриватБанк',
  '09306278': 'OKSI Bank',
  '09806443': 'Таскомбанк',
  '09807750': 'Укрсиббанк' // seen selling cars in Aug 2026, not in the plan's first list
}

export const SELLER_KINDS = ['bank', 'customs', 'bankruptcy', 'arma', 'state', 'commercial', 'lease'] as const
export type SellerKind = (typeof SELLER_KINDS)[number]

/** Why an auction produced no row (the ingest prints a count per reason). */
export const PROZORRO_REJECT_REASONS = ['invalid', 'not-vehicle', 'no-identifier'] as const
export type ProzorroRejectReason = (typeof PROZORRO_REJECT_REASONS)[number]

const L10n = z.object({ uk_UA: z.string().nullish() }).nullish()
const Num = z.union([z.number(), z.string()]).nullish()
const Amount = z.object({ amount: Num }).nullish()
const Strings = z.array(z.string()).nullish()

const ItemPropsSchema = z.object({
  itemPropsType: z.string().nullish(),
  identificationNumber: z.string().nullish(),
  brand: z.string().nullish(),
  model: z.string().nullish(),
  productionYear: Num,
  color: z.string().nullish(),
  kilometrage: Num,
  fuelType: z.string().nullish(),
  engineCapacity: Num,
  transmission: z.string().nullish(),
  condition: z.string().nullish(),
  damagePresence: z.boolean().nullish(),
  damagedDescription: z.string().nullish()
})

const ItemSchema = z.object({
  classification: z.object({ id: z.string().nullish() }).nullish(),
  description: L10n,
  itemProps: ItemPropsSchema.nullish(),
  address: z.object({ region: L10n, locality: L10n }).nullish(),
  location: z.object({ latitude: Num, longitude: Num }).nullish()
})

const Name = z.object({ name: L10n, identifier: z.object({ id: z.string().nullish() }).nullish() })

/** One feed record. Only the key, status and modification time are required. */
export const ProzorroAuctionSchema = z.object({
  auctionId: z.string().min(1),
  status: z.string().min(1),
  dateModified: z.string().min(1),
  sellingMethod: z.string().nullish(),
  title: L10n,
  description: L10n,
  value: Amount,
  minimalStep: Amount,
  guarantee: Amount,
  auctionPeriod: z.object({ startDate: z.string().nullish() }).nullish(),
  tenderPeriod: z.object({ startDate: z.string().nullish(), endDate: z.string().nullish() }).nullish(),
  sellingEntity: Name.nullish(),
  metaInfo: z.object({ directions: Strings, categories: Strings, auctionTypes: Strings }).nullish(),
  awards: z.array(z.object({ status: z.string().nullish(), value: Amount })).nullish(),
  documents: z
    .array(z.object({ documentType: z.string().nullish(), format: z.string().nullish(), url: z.string().nullish() }))
    .nullish(),
  items: z.array(ItemSchema).nullish()
})
export type ProzorroAuction = z.infer<typeof ProzorroAuctionSchema>
type Item = z.infer<typeof ItemSchema>

/** The parser always fills the three arrays (the table defaults them to `[]`). */
export type ProzorroAuctionRowInput = Omit<ProzorroAuctionInsert, 'firstSeenAt' | 'updatedAt'> & {
  categories: string[]
  directions: string[]
  photoUrls: string[]
}

export type ProzorroParseResult =
  | {
      ok: true
      row: ProzorroAuctionRowInput
      /** Vehicle items in the auction; above 1 only the first with an identifier is stored (the ingest logs the count). */
      vehicles: number
    }
  | { ok: false; reason: ProzorroRejectReason }

const text = (v: string | null | undefined): string | null => {
  const t = v?.replace(/\s+/g, ' ').trim()
  return t ? t : null
}

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const date = (v: string | null | undefined): Date | null => {
  const d = v ? new Date(v) : null
  return d && !Number.isNaN(d.getTime()) ? d : null
}

// ---------------------------------------------------------------------------------------------------------------------
// Vehicle test
// ---------------------------------------------------------------------------------------------------------------------

/** Words that make an item without CAV code or `vehicle` props vehicle-like; it still needs a VIN or plate to be stored. */
const VEHICLE_WORDS_RE =
  /(?<![\p{L}\d])(?:автомобіл|автобус|мікроавтобус|вантажівк|вантажн\p{L}* автомобіл|легков|мотоцикл|напівпричіп|причіп|тягач|трактор|транспортн\p{L}* засіб|транспортн\p{L}* засоб)/iu

/** CAV 34110000-34399999 = 341 vehicles, 342 bodies / trailers, 343 parts. */
const isVehicleItem = (item: Item, title: string | null): boolean => {
  if (/^34[123]/.test(item.classification?.id ?? '')) return true
  const type = item.itemProps?.itemPropsType
  if (type) return type === 'vehicle'
  return VEHICLE_WORDS_RE.test(`${item.description?.uk_UA ?? ''} ${title ?? ''}`)
}

/**
 * A property lot (bankruptcy estate with a vehicle list in the description) fills the vehicle props with the form's column header
 * ("НАЙМЕНУВАННЯ ТЗ/СГ, МАРКА, МОДЕЛЬ, ..."). The identifiers found in such a lot belong to one of many vehicles, so it is no row.
 */
const TEMPLATE_PROPS_RE = /ТЗ\s*\/\s*СГ/iu
const isTemplateItem = (props: Item['itemProps']): boolean =>
  [props?.brand, props?.model, props?.color].some(v => v && TEMPLATE_PROPS_RE.test(v))

// ---------------------------------------------------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------------------------------------------------

const ALNUM = '\\p{L}\\d'
const VIN_TOKEN_RE = new RegExp(`(?<![${ALNUM}])[${ALNUM}]{17}(?![${ALNUM}])`, 'gu')

/**
 * First 17-char token that is a VIN (letters I O Q never occur, so `isVin` rejects them; Cyrillic look-alikes are folded to Latin).
 * Works on a bare `identificationNumber` ("VF611GTA000122884 ", "VIN TMBCE11U538711317") and on running text alike.
 */
export function findVin(input: string | null | undefined): string | null {
  for (const m of (input ?? '').matchAll(VIN_TOKEN_RE)) {
    const vin = denormalizePlate(m[0]).toUpperCase()
    if (isVin(vin) && /\d/.test(vin)) return vin
  }
  return null
}

/** `1896 см`, `2000 куб`, `12000 кг` … read as a plate by a loose label match: digits + a unit prefix is never a plate. */
const MEASUREMENT_PLATE_RE = /^\d{3,5}(?:СМ|КМ|КГ|ММ|МЛ|КВТ|КУБ|ЛС|Л)\d?$/

/** Plate from free text via the shared normalizer; null for measurement look-alikes. Search order = order of `sources`. */
export function findPlate(sources: readonly (string | null | undefined)[]): string | null {
  for (const source of sources) {
    const plate = source ? titlePlate(source) : null
    if (plate && !MEASUREMENT_PLATE_RE.test(normalizePlate(plate))) return plate
  }
  return null
}

// ---------------------------------------------------------------------------------------------------------------------
// Seller kind
// ---------------------------------------------------------------------------------------------------------------------

type SellerFacts = {
  sellingMethod: string | null | undefined
  sellerName: string | null
  sellerEdrpou: string | null
  categories: readonly string[]
  directions: readonly string[]
}

/**
 * Seller kind from Prozorro's own tags and the seller (never from description text: "банк" matches "банкрут").
 * Order matters: ARMA and banks are the narrow sets, state is the catch-all (other alienation / basicSell / privatization).
 */
export function sellerKind(f: SellerFacts): SellerKind {
  const method = f.sellingMethod ?? ''
  if (/^armaProperty/.test(method) || f.categories.includes('arma') || f.directions.includes('arma')) return 'arma'
  if (
    (f.sellerEdrpou && f.sellerEdrpou in BANK_EDRPOU) ||
    f.categories.includes('npl') ||
    f.categories.includes('privatbank')
  )
    return 'bank'
  if (/^bankRuptcy/.test(method) || f.directions.includes('bankRuptcy')) return 'bankruptcy'
  if (f.categories.includes('customs') || /митниц/i.test(f.sellerName ?? '')) return 'customs'
  if (
    /^(?:legitimatePropertyLease|regulationsPropertyLease)/.test(method) ||
    f.directions.includes('legitimatePropertyLease') ||
    f.categories.includes('transportLease')
  )
    return 'lease'
  if (/^commercialSell/.test(method) || f.directions.includes('commercialSell')) return 'commercial'
  return 'state'
}

// ---------------------------------------------------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------------------------------------------------

/** Photos = `illustration` documents that are images (PDF, DOCX and `application/octet-stream` illustrations exist). */
function photoUrls(docs: ProzorroAuction['documents']): string[] {
  const urls = (docs ?? [])
    .filter(d => d.documentType === 'illustration' && d.format?.startsWith('image/') && d.url)
    .map(d => d.url as string)
  return [...new Set(urls)]
}

/** Award statuses that carry a winner and a price: confirmed (`active`) or confirmed and awaiting payment (`pending_payment`). */
const WINNING_AWARD = ['active', 'pending_payment']

/** The amount of the (last) winning award = the sale price; null while there is none (cancelled / unsuccessful awards do not count). */
function finalPrice(awards: ProzorroAuction['awards']): number | null {
  const won = (awards ?? []).filter(a => a.status && WINNING_AWARD.includes(a.status))
  return num(won.at(-1)?.value?.amount)
}

/** A feed record → a row, or a reject reason. Pure: the caller adds `firstSeenAt` / `updatedAt` (DB defaults). */
export function toProzorroAuctionInsert(raw: unknown, now = new Date()): ProzorroParseResult {
  const parsed = ProzorroAuctionSchema.safeParse(raw)
  const modified = parsed.success ? date(parsed.data.dateModified) : null
  if (!parsed.success || !modified) return { ok: false, reason: 'invalid' }
  const a = parsed.data

  const title = text(a.title?.uk_UA)
  const vehicleItems = (a.items ?? []).filter(item => isVehicleItem(item, title))
  if (vehicleItems.length === 0) return { ok: false, reason: 'not-vehicle' }

  const description = text(a.description?.uk_UA)
  for (const item of vehicleItems) {
    const props = item.itemProps
    if (isTemplateItem(props)) continue
    const itemText = text(item.description?.uk_UA)
    const sources = [itemText, title, description]
    const vin = findVin(props?.identificationNumber) ?? sources.map(findVin).find(v => v) ?? null
    const plate = findPlate(sources)
    if (!vin && !plate) continue

    // Structured props win; the title fills the gaps (a commercial lot may carry only the text).
    const fromTitle = titleMakeModel(title ?? itemText ?? '')
    const brand = text(props?.brand)
    const make = (brand ? titleMakeModel(brand).make : null) ?? brand?.toUpperCase() ?? fromTitle.make
    const model = text(props?.model)?.toUpperCase() ?? (brand ? null : fromTitle.model)
    const year = num(props?.productionYear)
    const categories = a.metaInfo?.categories ?? []
    const directions = a.metaInfo?.directions ?? []
    const sellerName = text(a.sellingEntity?.name?.uk_UA)
    const sellerEdrpou = text(a.sellingEntity?.identifier?.id)
    const region = text(item.address?.region?.uk_UA)

    return {
      ok: true,
      vehicles: vehicleItems.length,
      row: {
        auctionId: a.auctionId,
        sellingMethod: a.sellingMethod ?? null,
        status: a.status,
        value: num(a.value?.amount),
        minimalStep: num(a.minimalStep?.amount),
        guarantee: num(a.guarantee?.amount),
        finalPrice: finalPrice(a.awards),
        auctionStart: date(a.auctionPeriod?.startDate),
        tenderStart: date(a.tenderPeriod?.startDate),
        tenderEnd: date(a.tenderPeriod?.endDate),
        plate,
        vin,
        make,
        model,
        year: year !== null && year >= 1900 && year <= now.getFullYear() + 1 ? year : titleYear(title ?? '', now),
        color: text(props?.color),
        kilometrage: num(props?.kilometrage) === null ? null : Math.round(num(props?.kilometrage) as number),
        fuel: text(props?.fuelType),
        engineCc: num(props?.engineCapacity) === null ? null : Math.round(num(props?.engineCapacity) as number),
        transmission: text(props?.transmission),
        condition: text(props?.condition),
        damaged: props?.damagePresence ?? null,
        damageText: text(props?.damagedDescription),
        region: region ? lotRegion(/^київ$/i.test(region) ? 'м.Київ' : region) : null,
        locality: text(item.address?.locality?.uk_UA),
        lat: num(item.location?.latitude),
        lon: num(item.location?.longitude),
        titleRaw: title ?? itemText ?? '',
        descriptionRaw: description,
        sellerName,
        sellerEdrpou,
        sellerKind: sellerKind({ sellingMethod: a.sellingMethod, sellerName, sellerEdrpou, categories, directions }),
        categories,
        directions,
        auctionType: a.metaInfo?.auctionTypes?.[0] ?? a.sellingMethod?.split('-')[1] ?? null,
        photoUrls: photoUrls(a.documents),
        sourceModifiedAt: modified
      }
    }
  }
  return { ok: false, reason: 'no-identifier' }
}
