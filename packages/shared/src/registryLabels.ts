/**
 * Display names for the registry's Ukrainian fuel / body / colour words (`registry.registrations`), for the pages that show
 * them outside a plate card (the model catalog and its server-injected block). Ukrainian shows the stored word lowercased;
 * ru/en come from the tables below, and an unknown word falls back to the Ukrainian one. Lookup keys are the stored words
 * uppercased. Verified against the real values of the 300 biggest catalog models (2026-10-30).
 */

export type RegistryLabelKind = 'fuel' | 'body' | 'color'

type Names = readonly [ru: string, en: string]

const FUEL: Readonly<Record<string, Names>> = {
  БЕНЗИН: ['бензин', 'petrol'],
  'ДИЗЕЛЬНЕ ПАЛИВО': ['дизель', 'diesel'],
  'БЕНЗИН АБО ГАЗ': ['бензин или газ', 'petrol or LPG'],
  'ЕЛЕКТРО АБО БЕНЗИН': ['электро или бензин', 'electric or petrol'],
  ЕЛЕКТРО: ['электро', 'electric'],
  'ЕЛЕКТРО АБО ДИЗЕЛЬНЕ ПАЛИВО': ['электро или дизель', 'electric or diesel'],
  'БЕНЗИН, ГАЗ АБО ЕЛЕКТРО': ['бензин, газ или электро', 'petrol, LPG or electric'],
  'ДИЗЕЛЬНЕ ПАЛИВО АБО ГАЗ': ['дизель или газ', 'diesel or LPG'],
  ГАЗ: ['газ', 'LPG'],
  'ГАЗ ТА ЕЛЕКТРО': ['газ и электро', 'LPG and electric'],
  ВОДЕНЬ: ['водород', 'hydrogen'],
  'ЕЛЕКТРО АБО ГАЗ': ['электро или газ', 'electric or LPG'],
  'НЕ ВИЗНАЧЕНО': ['не определено', 'not specified'],
  NULL: ['не указано', 'not specified'],
  '.': ['не указано', 'not specified']
}

const BODY: Readonly<Record<string, Names>> = {
  СЕДАН: ['седан', 'sedan'],
  УНІВЕРСАЛ: ['универсал', 'estate'],
  ХЕТЧБЕК: ['хэтчбек', 'hatchback'],
  ПАСАЖИРСЬКИЙ: ['пассажирский', 'passenger van'],
  КОМБІ: ['комби', 'combi'],
  ВАНТАЖОПАСАЖИРСЬКИЙ: ['грузопассажирский', 'cargo-passenger van'],
  КУПЕ: ['купе', 'coupe'],
  ОПЕРАТИВНИЙ: ['оперативный', 'emergency service'],
  КАБРІОЛЕТ: ['кабриолет', 'convertible'],
  МЕДДОПОМОГА: ['медпомощь', 'ambulance'],
  ЛІМУЗИН: ['лимузин', 'limousine'],
  ЛЕГКОВИЙ: ['легковой', 'passenger car'],
  ЛІФТБЕК: ['лифтбек', 'liftback'],
  ПІКАП: ['пикап', 'pickup'],
  МІНІВЕН: ['минивэн', 'minivan'],
  РОДСТЕР: ['родстер', 'roadster'],
  ФУРГОН: ['фургон', 'van']
}

const COLOR: Readonly<Record<string, Names>> = {
  СІРИЙ: ['серый', 'grey'],
  ЧОРНИЙ: ['чёрный', 'black'],
  СИНІЙ: ['синий', 'blue'],
  БІЛИЙ: ['белый', 'white'],
  ЧЕРВОНИЙ: ['красный', 'red'],
  ЗЕЛЕНИЙ: ['зелёный', 'green'],
  БЕЖЕВИЙ: ['бежевый', 'beige'],
  КОРИЧНЕВИЙ: ['коричневый', 'brown'],
  ЖОВТИЙ: ['жёлтый', 'yellow'],
  ФІОЛЕТОВИЙ: ['фиолетовый', 'purple'],
  ОРАНЖЕВИЙ: ['оранжевый', 'orange'],
  'ПОМАРАНЧЕВИЙ (ОРАНЖЕВИЙ)': ['оранжевый', 'orange'],
  РОЖЕВИЙ: ['розовый', 'pink'],
  ГОЛУБИЙ: ['голубой', 'light blue'],
  БОРДОВИЙ: ['бордовый', 'burgundy'],
  ВИШНЕВИЙ: ['вишнёвый', 'cherry'],
  ЗОЛОТИСТИЙ: ['золотистый', 'gold'],
  СРІБЛЯСТИЙ: ['серебристый', 'silver'],
  СРІБНИЙ: ['серебристый', 'silver']
}

const TABLES: Readonly<Record<RegistryLabelKind, Readonly<Record<string, Names>>>> = {
  fuel: FUEL,
  body: BODY,
  color: COLOR
}

/** Body words carry a stray ` B` / `-B` suffix (Latin or Cyrillic В, a registry data-entry artefact): `СЕДАН-B`, `ХЕТЧБЕК В`. */
const VARIANT_SUFFIX = /[-\s][BВ]$/u

const ukLower = (s: string): string => s.toLocaleLowerCase('uk-UA')

/** The registry word in `lang` (`ua`, `ru` or `en`; anything else reads as `ua`), lowercase, variant suffix dropped. */
export function registryLabel(kind: RegistryLabelKind, value: string, lang: string): string {
  const key = value.trim().toUpperCase().replace(VARIANT_SUFFIX, '')
  const names = lang === 'ru' || lang === 'en' ? TABLES[kind][key] : undefined
  if (names) return lang === 'ru' ? names[0] : names[1]
  return ukLower(key)
}

/**
 * Localizes the `[word, count]` rows of one stat list and merges the words that now read the same (`СЕДАН` + `СЕДАН-B`,
 * `NULL` + `.`), biggest first.
 */
export function localizeRegistryRows(
  kind: RegistryLabelKind,
  rows: readonly (readonly [string, number])[],
  lang: string
): [string, number][] {
  const merged = new Map<string, number>()
  for (const [value, n] of rows) {
    const label = registryLabel(kind, value, lang)
    merged.set(label, (merged.get(label) ?? 0) + n)
  }
  return [...merged].sort((a, b) => b[1] - a[1])
}
