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

/** Special-purpose category for a raw registry `body` value, or `null` for generic / unrecognised bodies. */
export function resolveBodyCategory(body: string | null | undefined): BodyCategory | null {
  if (!body) return null
  const text = body.trim().toUpperCase()
  return BODY_RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? null
}
