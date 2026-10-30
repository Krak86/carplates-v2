/**
 * Region display names for the pages and the server-injected catalog block. Keys are the `REGIONS` names (Ukrainian, also the
 * DB / query key); Ukrainian shows as stored.
 */

type NameByLang = { ru: string; en: string }

const REGION_LABELS: Readonly<Record<string, NameByLang>> = {
  Київ: { ru: 'Киев', en: 'Kyiv' },
  Севастополь: { ru: 'Севастополь', en: 'Sevastopol' },
  'АР Крим': { ru: 'АР Крым', en: 'Crimea' },
  'Київська область': { ru: 'Киевская область', en: 'Kyiv Oblast' },
  'Вінницька область': { ru: 'Винницкая область', en: 'Vinnytsia Oblast' },
  'Волинська область': { ru: 'Волынская область', en: 'Volyn Oblast' },
  'Дніпропетровська область': { ru: 'Днепропетровская область', en: 'Dnipropetrovsk Oblast' },
  'Донецька область': { ru: 'Донецкая область', en: 'Donetsk Oblast' },
  'Житомирська область': { ru: 'Житомирская область', en: 'Zhytomyr Oblast' },
  'Закарпатська область': { ru: 'Закарпатская область', en: 'Zakarpattia Oblast' },
  'Запорізька область': { ru: 'Запорожская область', en: 'Zaporizhzhia Oblast' },
  'Івано-Франківська область': { ru: 'Ивано-Франковская область', en: 'Ivano-Frankivsk Oblast' },
  'Кіровоградська область': { ru: 'Кировоградская область', en: 'Kirovohrad Oblast' },
  'Луганська область': { ru: 'Луганская область', en: 'Luhansk Oblast' },
  'Львівська область': { ru: 'Львовская область', en: 'Lviv Oblast' },
  'Миколаївська область': { ru: 'Николаевская область', en: 'Mykolaiv Oblast' },
  'Одеська область': { ru: 'Одесская область', en: 'Odesa Oblast' },
  'Полтавська область': { ru: 'Полтавская область', en: 'Poltava Oblast' },
  'Рівненська область': { ru: 'Ровенская область', en: 'Rivne Oblast' },
  'Сумська область': { ru: 'Сумская область', en: 'Sumy Oblast' },
  'Тернопільська область': { ru: 'Тернопольская область', en: 'Ternopil Oblast' },
  'Харківська область': { ru: 'Харьковская область', en: 'Kharkiv Oblast' },
  'Херсонська область': { ru: 'Херсонская область', en: 'Kherson Oblast' },
  'Хмельницька область': { ru: 'Хмельницкая область', en: 'Khmelnytskyi Oblast' },
  'Черкаська область': { ru: 'Черкасская область', en: 'Cherkasy Oblast' },
  'Чернівецька область': { ru: 'Черновицкая область', en: 'Chernivtsi Oblast' },
  'Чернігівська область': { ru: 'Черниговская область', en: 'Chernihiv Oblast' }
}

/** A `REGIONS` name in the UI language; an unknown name (or Ukrainian) is returned unchanged. */
export function localizeRegion<T extends string | null | undefined>(name: T, lang: string): T {
  if (!name || (lang !== 'ru' && lang !== 'en')) return name
  return (REGION_LABELS[name]?.[lang] ?? name) as T
}
