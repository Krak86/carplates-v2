/**
 * geoBoundaries.org Ukraine ADM1 `shapeISO` → the exact Ukrainian region string
 * `REGIONS` (`@carplates/shared`) produces, so a `stats.byRegion` row can be
 * matched to its map polygon. 27 units on both sides (24 oblasts + Kyiv +
 * Sevastopol + AR Crimea) — see `region-geography.test.ts`.
 */
export const REGION_NAME_BY_SHAPE_ISO: Readonly<Record<string, string>> = {
  'UA-30': 'Київ',
  'UA-32': 'Київська область',
  'UA-05': 'Вінницька область',
  'UA-07': 'Волинська область',
  'UA-12': 'Дніпропетровська область',
  'UA-43': 'АР Крим',
  'UA-14': 'Донецька область',
  'UA-18': 'Житомирська область',
  'UA-21': 'Закарпатська область',
  'UA-23': 'Запорізька область',
  'UA-26': 'Івано-Франківська область',
  'UA-35': 'Кіровоградська область',
  'UA-09': 'Луганська область',
  'UA-46': 'Львівська область',
  'UA-48': 'Миколаївська область',
  'UA-51': 'Одеська область',
  'UA-53': 'Полтавська область',
  'UA-56': 'Рівненська область',
  'UA-40': 'Севастополь',
  'UA-59': 'Сумська область',
  'UA-61': 'Тернопільська область',
  'UA-63': 'Харківська область',
  'UA-65': 'Херсонська область',
  'UA-68': 'Хмельницька область',
  'UA-71': 'Черкаська область',
  'UA-74': 'Чернігівська область',
  'UA-77': 'Чернівецька область'
}
