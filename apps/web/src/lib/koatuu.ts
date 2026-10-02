type Lang = 'ua' | 'ru' | 'en'

// KOATUU's first two digits are the oblast (or the cities of special status).
const KOATUU_REGIONS: Readonly<Record<string, Readonly<Record<Lang, string>>>> = {
  '01': { ua: 'АР Крим', ru: 'АР Крым', en: 'Crimea' },
  '05': { ua: 'Вінницька область', ru: 'Винницкая область', en: 'Vinnytsia Oblast' },
  '07': { ua: 'Волинська область', ru: 'Волынская область', en: 'Volyn Oblast' },
  '12': { ua: 'Дніпропетровська область', ru: 'Днепропетровская область', en: 'Dnipropetrovsk Oblast' },
  '14': { ua: 'Донецька область', ru: 'Донецкая область', en: 'Donetsk Oblast' },
  '18': { ua: 'Житомирська область', ru: 'Житомирская область', en: 'Zhytomyr Oblast' },
  '21': { ua: 'Закарпатська область', ru: 'Закарпатская область', en: 'Zakarpattia Oblast' },
  '23': { ua: 'Запорізька область', ru: 'Запорожская область', en: 'Zaporizhzhia Oblast' },
  '26': { ua: 'Івано-Франківська область', ru: 'Ивано-Франковская область', en: 'Ivano-Frankivsk Oblast' },
  '32': { ua: 'Київська область', ru: 'Киевская область', en: 'Kyiv Oblast' },
  '35': { ua: 'Кіровоградська область', ru: 'Кировоградская область', en: 'Kirovohrad Oblast' },
  '44': { ua: 'Луганська область', ru: 'Луганская область', en: 'Luhansk Oblast' },
  '46': { ua: 'Львівська область', ru: 'Львовская область', en: 'Lviv Oblast' },
  '48': { ua: 'Миколаївська область', ru: 'Николаевская область', en: 'Mykolaiv Oblast' },
  '51': { ua: 'Одеська область', ru: 'Одесская область', en: 'Odesa Oblast' },
  '53': { ua: 'Полтавська область', ru: 'Полтавская область', en: 'Poltava Oblast' },
  '56': { ua: 'Рівненська область', ru: 'Ровенская область', en: 'Rivne Oblast' },
  '59': { ua: 'Сумська область', ru: 'Сумская область', en: 'Sumy Oblast' },
  '61': { ua: 'Тернопільська область', ru: 'Тернопольская область', en: 'Ternopil Oblast' },
  '63': { ua: 'Харківська область', ru: 'Харьковская область', en: 'Kharkiv Oblast' },
  '65': { ua: 'Херсонська область', ru: 'Херсонская область', en: 'Kherson Oblast' },
  '68': { ua: 'Хмельницька область', ru: 'Хмельницкая область', en: 'Khmelnytskyi Oblast' },
  '71': { ua: 'Черкаська область', ru: 'Черкасская область', en: 'Cherkasy Oblast' },
  '73': { ua: 'Чернівецька область', ru: 'Черновицкая область', en: 'Chernivtsi Oblast' },
  '74': { ua: 'Чернігівська область', ru: 'Черниговская область', en: 'Chernihiv Oblast' },
  '80': { ua: 'місто Київ', ru: 'город Киев', en: 'Kyiv city' },
  '85': { ua: 'місто Севастополь', ru: 'город Севастополь', en: 'Sevastopol city' }
}

/** Oblast named by a KOATUU code's first two digits, in the UI language — undefined for an unknown prefix. */
export function koatuuRegion(code: string | null | undefined, lang: string): string | undefined {
  const region = KOATUU_REGIONS[code?.slice(0, 2) ?? '']
  return region?.[lang === 'ru' || lang === 'en' ? lang : 'ua']
}
