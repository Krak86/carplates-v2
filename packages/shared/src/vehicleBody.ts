import { z } from 'zod'

/**
 * `registry.current_registration.body` is free text with 150+ granular values and a year-dependent licence-category
 * suffix ("СЕДАН", "СЕДАН-B", "МІКРОАВТОБУС МЕДДОПОМОГА"), so the advanced-search filter is a substring match on the raw
 * text with autocomplete over the real values (ranked by `stats_by_body`). Lives here, not in schemas.ts, whose hash
 * busts users' offline caches.
 */
export const bodySuggestionSchema = z.object({
  body: z.string(),
  distinctPlates: z.number().int().nonnegative()
})
export type BodySuggestion = z.infer<typeof bodySuggestionSchema>

/** GET /api/search/bodies?q= — top-10 matching raw body values by distinctPlates. */
export const bodySuggestionsResponseSchema = z.object({ suggestions: z.array(bodySuggestionSchema) })
export type BodySuggestionsResponse = z.infer<typeof bodySuggestionsResponseSchema>

/**
 * Special-purpose body categories for the result-card icon + description. Deliberately NOT the vehicle kind (car / truck /
 * bus / trailer … live in `vehicleKind.ts`): generic shapes (СЕДАН, УНІВЕРСАЛ, ФУРГОН, БОРТОВИЙ, ПР-/Н/ПР- prefixes) get no
 * category, only bodies that say what the vehicle is *for*. Keyword-matched like fuel, because `body` is free text with a
 * year-dependent suffix and spelling variants ("МЕДДОПОМ.", "ЕСКАВАТОР").
 */
export const BODY_CATEGORIES = [
  'fire',
  'ambulance',
  'operational',
  'tow',
  'service',
  'crane',
  'lift',
  'concrete',
  'garbage',
  'roadwork',
  'sewage',
  'water',
  'food',
  'dangerous',
  'tanker',
  'refrigerated',
  'bread',
  'livestock',
  'grain',
  'timber',
  'carCarrier',
  'container',
  'boatTrailer',
  'camper',
  'hearse',
  'limousine',
  'schoolBus',
  'accessible',
  'shiftBus',
  'armored',
  'training',
  'lab',
  'drilling',
  'excavator',
  'equipment',
  'power',
  'dump',
  'convertible',
  'pickup',
  'kitchen',
  'shop',
  'radio'
] as const

export type BodyCategory = (typeof BODY_CATEGORIES)[number]

/** First match wins, so specific rules sit before generic ones (ЦИСТЕРНА ПОЖЕЖНА → fire, not tanker). */
const BODY_RULES: ReadonlyArray<readonly [BodyCategory, RegExp]> = [
  ['fire', /ПОЖЕЖН|ПАЛЕБІЙН/],
  ['ambulance', /МЕДДОПОМ|МЕДИЧН|САНІТАРН/],
  ['operational', /ОПЕРАТИВ|АВАРІЙНО-РЯТУВ/],
  ['tow', /ЕВАКУАТОР|ЕВАКУАЦІЙН/],
  ['service', /ТЕХДОПОМОГА|АВАРІЙНО-РЕМОНТН|АВТОМАЙСТЕРН/],
  ['crane', /АВТОКРАН/],
  ['lift', /АВТОПІДЙОМНИК|АВТОВИШКА|ПІДІЙМАЛЬН|ПІДЙОМНИК/],
  ['concrete', /БЕТОН|ЦЕМЕНТОВОЗ|РОЗЧИНОВОЗ/],
  ['garbage', /СМІТТЄВОЗ/],
  ['roadwork', /ПІДМІТАЛЬН|СНІГООЧИС|ПІСКОРОЗКИД|ДОРОЖН|РОЗКИДАННЯ ПІСКУ/],
  ['sewage', /АСЕНІЗАЦ|КАНАЛОПРОМИВ|МУЛОСОС/],
  ['water', /ВОДОЦИСТЕРН|ПОЛИВОМИЄЧН/],
  ['food', /ХАРЧОВ/],
  ['dangerous', /НЕБЕЗ/],
  ['tanker', /ЦИСТЕРН|ПАЛИВОЗАПРАВ|БІТУМОВОЗ|ГУДРОНАТОР/],
  ['refrigerated', /РЕФРИЖЕРАТОР|ІЗОТЕРМІЧН/],
  ['bread', /ХЛІБН/],
  ['livestock', /ХУДОБИ|ТВАРИН|ПТИЦІ|КОРМОВОЗ/],
  ['grain', /ЗЕРНОВОЗ|БОРОШНОВОЗ/],
  ['timber', /ЛІСОВОЗ|СОРТИМЕНТОВОЗ|ЩЕПОДРОБ|ПОДРІБНЮВАЧ|ПЕРЕСАДЖУВАННЯ ДЕРЕВ/],
  ['carCarrier', /АВТОВОЗ/],
  ['container', /КОНТЕЙНЕРОВОЗ|ЗМІННИЙ КУЗОВ/],
  ['boatTrailer', /ЧОВНІВ|ГІДРОЦИКЛІВ/],
  ['camper', /ЖИТЛОВИЙ|КЕМПЕР/],
  ['hearse', /КАТАФАЛК/],
  ['limousine', /ЛІМУЗИН/],
  ['schoolBus', /ДЛЯ ПЕРЕВЕЗЕННЯ ДІТЕЙ/],
  ['accessible', /ІНВАЛІД|МОТОКОЛЯСКА/],
  ['shiftBus', /ВАХТОВ/],
  ['armored', /БРОНЬОВАН|УВ.ЯЗНЕН|ОХОРОНА/],
  ['training', /УЧБОВ|НАВЧАЛЬН/],
  ['lab', /ЛАБОРАТОР/],
  ['drilling', /БУРОВИЙ|СВЕРДЛОВИН|КАРОТАЖН/],
  ['excavator', /ЕКСКАВАТОР|ЕСКАВАТОР/],
  ['equipment', /НАСОСН|КОМПРЕСОР|ПАРОГЕНЕР|ГІДРАТАЦ|МАНІФОЛЬД|КОЛТЮБІНГ|ЗМІШУВАЛЬНО|МЛИНО/],
  ['power', /ГЕНЕРАТОР|ЕЛЕКТРОСТАНЦ|ЕЛЕКТРОРОЗПОДІЛ/],
  ['dump', /САМОСКИД/],
  ['convertible', /КАБРІОЛЕТ|ФАЕТОН/],
  ['pickup', /ПІКАП/],
  ['kitchen', /КУХНЯ/],
  ['shop', /ТОРГОВИЙ/],
  ['radio', /РАДІОТЕХН/]
]

/**
 * The registry spelled the body with a licence-category suffix ("КАБРІОЛЕТ-B", "МОТОЦИКЛ-A", "ФУРГОН-C", "АВТОБУС-D",
 * "ПР-БОРТОВИЙ-E", "ТРИЦИКЛ-B1") up to 2020 registrations and without it from 2021 — same vehicles, same fields. Display,
 * stats grouping and search treat both as the plain name. The suffix is Latin; the look-alike Cyrillic letters are accepted too.
 */
export function normalizeBody(body: string): string
export function normalizeBody(body: string | null | undefined): string | null
export function normalizeBody(body: string | null | undefined): string | null {
  if (!body) return null
  return body.trim().replace(/-[A-EАВЕС]1?$/i, '')
}

type BodyStatsRow = { body: string | null; totalRows: number; distinctPlates: number; distinctVins: number }

/** `stats_by_body` rows with the "-B" and plain spellings summed into one row (the plain name), biggest first. */
export function mergeBodyStats<T extends BodyStatsRow>(rows: readonly T[]): T[] {
  const merged = new Map<string | null, T>()
  for (const row of rows) {
    const key = normalizeBody(row.body)
    const prev = merged.get(key)
    merged.set(
      key,
      prev
        ? {
            ...prev,
            totalRows: prev.totalRows + row.totalRows,
            distinctPlates: prev.distinctPlates + row.distinctPlates,
            distinctVins: prev.distinctVins + row.distinctVins
          }
        : { ...row, body: key }
    )
  }
  return [...merged.values()].sort((a, b) => b.distinctPlates - a.distinctPlates)
}

/** Special-purpose category for a raw registry `body` value, or `null` for generic / unrecognised bodies. */
export function resolveBodyCategory(body: string | null | undefined): BodyCategory | null {
  if (!body) return null
  const text = body.trim().toUpperCase()
  return BODY_RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? null
}
