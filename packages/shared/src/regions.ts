import { isLegacyUaPlate } from './plate.js'

/**
 * First two characters of a Ukrainian plate → registration region.
 * Ported verbatim from the v1 app (`src/js/data/Data.ts`).
 */
export const REGIONS: Readonly<Record<string, string>> = {
  АА: 'Київ',
  КА: 'Київ',

  АІ: 'Київська область',
  КІ: 'Київська область',

  АВ: 'Вінницька область',
  КВ: 'Вінницька область',

  АС: 'Волинська область',
  КС: 'Волинська область',

  АЕ: 'Дніпропетровська область',
  КЕ: 'Дніпропетровська область',

  АК: 'АР Крим',
  КК: 'АР Крим',

  АН: 'Донецька область',
  КН: 'Донецька область',

  АМ: 'Житомирська область',
  КМ: 'Житомирська область',

  АО: 'Закарпатська область',
  КО: 'Закарпатська область',

  АР: 'Запорізька область',
  КР: 'Запорізька область',

  АТ: 'Івано-Франківська область',
  КТ: 'Івано-Франківська область',

  ВА: 'Кіровоградська область',
  НА: 'Кіровоградська область',

  ВВ: 'Луганська область',
  НВ: 'Луганська область',

  ВС: 'Львівська область',
  НС: 'Львівська область',

  ВЕ: 'Миколаївська область',
  НЕ: 'Миколаївська область',

  ВН: 'Одеська область',
  НН: 'Одеська область',

  ВІ: 'Полтавська область',
  НІ: 'Полтавська область',

  ВК: 'Рівненська область',
  НК: 'Рівненська область',

  СН: 'Севастополь',
  ІН: 'Севастополь',

  ВМ: 'Сумська область',
  НМ: 'Сумська область',

  ВО: 'Тернопільська область',
  НО: 'Тернопільська область',

  АХ: 'Харківська область',
  КХ: 'Харківська область',

  ВТ: 'Херсонська область',
  НТ: 'Херсонська область',

  ВХ: 'Хмельницька область',
  НХ: 'Хмельницька область',

  СА: 'Черкаська область',
  ІА: 'Черкаська область',

  СВ: 'Чернігівська область',
  ІВ: 'Чернігівська область',

  СЕ: 'Чернівецька область',
  ІЕ: 'Чернівецька область'
}

/**
 * Legacy (pre-2004) plates carry a two-digit region code first ("11АА1234"). Each code is confirmed
 * against the registry's `dep` (issuing unit) column for that code, e.g. 11 → ВРЕР УДАІ в м. Києві.
 * Codes 25/26 are Чернігів/Чернівці in that order (not alphabetical). Stray codes (34, 50) are not mapped.
 */
export const LEGACY_REGIONS: Readonly<Record<string, string>> = {
  '01': 'АР Крим',
  '02': 'Вінницька область',
  '03': 'Волинська область',
  '04': 'Дніпропетровська область',
  '05': 'Донецька область',
  '06': 'Житомирська область',
  '07': 'Закарпатська область',
  '08': 'Запорізька область',
  '09': 'Івано-Франківська область',
  '10': 'Київська область',
  '11': 'Київ',
  '12': 'Кіровоградська область',
  '13': 'Луганська область',
  '14': 'Львівська область',
  '15': 'Миколаївська область',
  '16': 'Одеська область',
  '17': 'Полтавська область',
  '18': 'Рівненська область',
  '19': 'Сумська область',
  '20': 'Тернопільська область',
  '21': 'Харківська область',
  '22': 'Херсонська область',
  '23': 'Хмельницька область',
  '24': 'Черкаська область',
  '25': 'Чернігівська область',
  '26': 'Чернівецька область',
  '27': 'Севастополь'
}

/**
 * Plate series issued by how the service was ordered, not by region (ГСЦ МВС, Jan 2026): `DІ` (Latin D +
 * Cyrillic І) via the Diia app, `ЕD` (Cyrillic Е + Latin D) via the Driver's Cabinet.
 */
export const PLATE_SERIES = { DІ: 'diia', ЕD: 'driverCabinet' } as const

export type PlateSeries = (typeof PLATE_SERIES)[keyof typeof PLATE_SERIES]

/** The region-less series of a normalized plate (`DІ7635ІА` → 'diia'), or `undefined`. */
export function plateSeries(plate: string): PlateSeries | undefined {
  return (PLATE_SERIES as Readonly<Record<string, PlateSeries>>)[plate.slice(0, 2)]
}

/** Registration region for a normalized (Cyrillic) plate, or `undefined` if the prefix is unknown. */
export function regionName(plate: string): string | undefined {
  const prefix = plate.slice(0, 2)
  return REGIONS[prefix] ?? (isLegacyUaPlate(plate) ? LEGACY_REGIONS[prefix] : undefined)
}

/** Every distinct region name, derived from `REGIONS` (never hand-duplicated) — sorted for a stable dropdown order. */
export const REGION_NAMES: readonly string[] = [...new Set(Object.values(REGIONS))].sort((a, b) =>
  a.localeCompare(b, 'uk')
)

/** The plate prefixes (1-2, per `REGIONS`) for a region name — for building a search filter (`inArray`). Empty if unrecognized. */
export function platePrefixesForRegion(region: string): string[] {
  return [...Object.entries(REGIONS), ...Object.entries(LEGACY_REGIONS)]
    .filter(([, name]) => name === region)
    .map(([prefix]) => prefix)
}
