/**
 * Registry model → searchable name for the Wikimedia photo pre-warm. The registry stores factory indexes (`21104`,
 * `110307-42`, `T13110`) and engine-code names (`E 270 CDI`, `116 i`) that Commons / Wikipedia know under a marketing
 * name (VAZ-2110, ZAZ Slavuta, Mercedes-Benz E-Class). Rows stay keyed by the registry brand/model; only the search
 * and the title matching use the alias.
 */

import { ZAZ_FAMILY_SEARCH, zazFactoryFamily } from './modelFamily.js'

export type WikiSearchName = {
  /** Commons file-title search brand, e.g. `VAZ`. */
  brand: string
  /** Commons search + title-match model, e.g. `2110`, `Niva`. */
  model: string
  /** Wikipedia (en/ru/uk) search text for the lead image; Cyrillic where the article is Russian/Ukrainian-named. */
  leadQuery: string
}

const VAZ_BRANDS = new Set(['ваз', 'lada', 'богдан', 'bogdan', 'vaz'])
const ZAZ_BRANDS = new Set(['заз', 'заз-daewoo', 'zaz'])

const vaz = (number: string): WikiSearchName => ({ brand: 'VAZ', model: number, leadQuery: `ВАЗ-${number}` })
const named = (brand: string, model: string, leadQuery = `${brand} ${model}`): WikiSearchName => ({
  brand,
  model,
  leadQuery
})

function vazAlias(model: string): WikiSearchName | null {
  const digits = /^(\d{4,6})(?:\D.*)?$/.exec(model)?.[1]
  if (!digits) return null
  const four = digits.slice(0, 4)
  if (four === '2121' || four === '2131') return named('Lada', 'Niva', 'Lada Niva')
  if (four === '2170' || four === '2171' || four === '2172') return named('Lada', 'Priora', 'Lada Priora')
  if (four === '1117' || four === '1118' || four === '1119') return named('Lada', 'Kalina', 'Lada Kalina')
  if (four === '2101' || four === '2102' || four === '2103' || four === '2104') return vaz(four)
  if (four === '2105' || four === '2106' || four === '2107') return vaz(four)
  if (four === '2108' || four === '2109') return vaz(four)
  if (four === '2110' || four === '2111' || four === '2112' || four === '2113') return vaz(four)
  if (four === '2114' || four === '2115') return vaz(four)
  if (four === '2190' || four === '2191') return named('Lada', 'Granta', 'Lada Granta')
  return null
}

function zazAlias(model: string): WikiSearchName | null {
  const m = model.toLowerCase()
  // A bare `lanos` stays searchable as is; only "lanos <trim>" is renamed. Families without a search name map to null.
  const family = /^lanos\s\S/.test(m) ? 'Lanos' : m === 'nubira' ? 'Nubira' : zazFactoryFamily(m, true)
  return (family && ZAZ_FAMILY_SEARCH[family]) || null
}

const MERCEDES_CLASS = /^([abces])\s?\d{2,3}[a-z]{0,3}(?:\s|$)/
const BMW_SERIES = /^([1-8])\d{2}\s?[a-z]{0,3}$/

/** The searchable name for a registry brand/model (both already lower-cased), or null when the model is searchable as is. */
export function wikiSearchName(registryBrand: string, model: string): WikiSearchName | null {
  // Many registry rows carry the model inside `brand` too ("ваз 21063", "заз-daewoo t13110", "mercedes-benz e 200").
  const brand = registryBrand.split(' ')[0] ?? registryBrand
  const alias = brandAlias(brand, model)
  if (alias) return alias
  // "corolla 1.33l", "a4 1.8", "mazda 6 2.5": the engine size is not part of the model name.
  const base = ENGINE_SIZE_SUFFIX.exec(model)?.[1]
  if (base) return named(brand, base.replace(/^nuovo /, ''))
  // "seat leon" + "leon": the model is repeated in the brand, and a search for "seat leon leon" finds nothing.
  const rest = registryBrand.slice(brand.length).trim()
  if (rest && (model === rest || model.startsWith(`${rest} `))) return named(brand, model)
  return null
}

const ENGINE_SIZE_SUFFIX = /^(.*?[a-zа-я0-9])\s+\d\.\d.*$/

function brandAlias(brand: string, model: string): WikiSearchName | null {
  if (brand === 'geely') {
    if (/^mr-?7151/.test(model.replace(/\s/g, '-'))) return named('Geely', 'MK')
    if (model === 'mk cross') return named('Geely', 'MK Cross')
    if (/^(mk )?jl71[56]2/.test(model)) return named('Geely', 'MK')
    if (/^ck-?2/.test(model)) return named('Geely', 'CK')
    if (/^fe-?1/.test(model) || /^lc-?1/.test(model)) return named('Geely', 'LC')
    if (/^(fc )?mr-?7180/.test(model)) return named('Geely', 'FC')
  }
  if (brand === 'fiat' && /^(nuovo )?doblo/.test(model)) return named('Fiat', 'Doblo')
  if (brand === 'kia' && model.startsWith('sorento')) return named('Kia', 'Sorento')
  if (brand === 'mitsubishi') {
    if (model === 'l 400') return named('Mitsubishi', 'L400')
    if (model === 'speace star') return named('Mitsubishi', 'Space Star')
    if (model === 'carizma') return named('Mitsubishi', 'Carisma')
    if (model.startsWith('pajero')) return named('Mitsubishi', 'Pajero')
  }
  if (brand === 'peugeot') {
    if (model.startsWith('expert')) return named('Peugeot', 'Expert')
    // Trim words after the number: "307 xs 2.0 e".
    const number = /^(\d{3})\s[a-z]{1,3}(\s|$)/.exec(model)?.[1]
    if (number) return named('Peugeot', number)
  }
  if (brand === 'газ') {
    if (model.startsWith('2410')) return named('GAZ', '24', 'ГАЗ-24 Волга')
    if (model.startsWith('2705') || model.startsWith('3221')) return named('GAZ', 'Gazelle', 'ГАЗель')
    if (model.startsWith('2752') || model.startsWith('2217')) return named('GAZ', 'Sobol', 'ГАЗ Соболь')
    if (model.startsWith('31105')) return named('GAZ', '31105', 'ГАЗ-31105 Волга')
  }
  if (brand === 'уаз') {
    if (model.startsWith('3909') || model.startsWith('3962') || model.startsWith('2206'))
      return named('UAZ', '452', 'УАЗ-452')
    if (/^(3151|469)/.test(model)) return named('UAZ', '469', 'УАЗ-469')
    if (model.startsWith('3163')) return named('UAZ', 'Patriot', 'УАЗ Патріот')
  }
  if (brand === 'иж') {
    if (model.startsWith('2125')) return named('IZh', '2125', 'ИЖ-2125 Комби')
    if (model.startsWith('2717')) return named('IZh', '2717', 'ИЖ-2717')
  }
  if (brand === 'hyundai' && model === 'h200') return named('Hyundai', 'H-1')
  if (brand === 'mazda' && /^\d$/.test(model)) return named('Mazda', `Mazda${model}`)
  if (brand === 'citroen' && /^c \d$/.test(model)) return named('Citroen', model.replace(' ', ''))
  // "c1sx" is a typo for the C1 (the registry has no SX trim).
  if (brand === 'citroen' && model === 'c1sx') return named('Citroen', 'C1')
  if (brand === 'chrysler' && /^gr\.? ?voyager/.test(model)) return named('Chrysler', 'Grand Voyager')
  if (brand === 'skoda' && model.startsWith('octavia a8')) return named('Skoda', 'Octavia')
  if (brand === 'volvo' && /^v\d{2}cc$/.test(model)) return named('Volvo', model.slice(0, 3))
  if (brand === 'peugeot' && model === 'e2008') return named('Peugeot', '2008')
  if (brand === 'renault' && model === 'clio simbol') return named('Renault', 'Symbol')
  if (brand === 'volkswagen' && model.startsWith('cc ')) return named('Volkswagen', 'CC')
  if (brand === 'луаз' && model.startsWith('969')) return named('LuAZ', '969', 'ЛуАЗ-969')
  if (brand === 'иж' && model.startsWith('412')) return named('Moskvich', '412', 'Москвич-412')
  if (brand === 'smart' && model === 'mc 01') return named('Smart', 'Fortwo')
  if (brand === 'chevrolet' && model === 'evanda') return named('Daewoo', 'Evanda')
  if (brand === 'renault' && model === 'megane scenic') return named('Renault', 'Scenic')
  if (brand === 'byd' && model === 'f-3') return named('BYD', 'F3')
  if (brand === 'infiniti') {
    const family = /^(fx|ex|qx|jx|g|m)\s?\d{2}$/.exec(model)?.[1]
    if (family) return named('Infiniti', family.toUpperCase())
  }
  if (brand === 'volkswagen' && /^lt\s?\d{2}$/.test(model)) return named('Volkswagen', 'LT')
  if (brand === 'daewoo' || brand === 'fso') {
    if (zazFactoryFamily(model, true) === 'Sens') return ZAZ_FAMILY_SEARCH.Sens ?? null
    if (model.includes('nubira')) return ZAZ_FAMILY_SEARCH.Nubira ?? null
    if (model.includes('lanos')) return ZAZ_FAMILY_SEARCH.Lanos ?? null
  }
  if (brand === 'lexus') {
    const lexus = /^(rx|es|is|gs|nx|ls|lx|gx|ux)\s?\d{3}/.exec(model)?.[1]
    return lexus ? named('Lexus', lexus.toUpperCase()) : null
  }
  if (brand === 'kia' && model === 'magentis') return named('Kia', 'Optima', 'Kia Magentis')
  if (brand === 'mitsubishi' && model === 'l 200') return named('Mitsubishi', 'L200')
  if (brand === 'suzuki' && model.startsWith('new sx4')) return named('Suzuki', 'SX4')
  if (VAZ_BRANDS.has(brand)) return vazAlias(model)
  if (ZAZ_BRANDS.has(brand)) return zazAlias(model)
  if (brand === 'азлк' || brand === 'москвич')
    return model.startsWith('2141') ? named('Moskvich', '2141', 'Москвич-2141') : null
  if (brand === 'mercedes-benz') {
    // The registry types the Cyrillic "е" in "230 е" / "200 е".
    const m = model.replace(/е/g, 'e')
    if (/^(ml|gl)\s?\d{2,3}/.test(m)) return named('Mercedes-Benz', m.startsWith('ml') ? 'M-Class' : 'GL-Class')
    if (/^g\s?\d{2,3}/.test(m)) return named('Mercedes-Benz', 'G-Class')
    if (/^3\d{2}\s?cdi/.test(m)) return named('Mercedes-Benz', 'Sprinter')
    if (/^(vito )?1\d{2}\s?(cdi|d)$/.test(m)) return named('Mercedes-Benz', 'Vito')
    if (/^[23](08|10|11|12|14)\s?d$/.test(m)) return named('Mercedes-Benz', 'T1')
    if (/^190(\s?[de])?$/.test(m)) return named('Mercedes-Benz', '190')
    // Pre-1995 numeric names (200, 230 e, 250 d): the W123/W124 era, which Commons files under the E-Class.
    if (/^2[0-9]{2}(\s?[de])?$/.test(m) || m === '320') return named('Mercedes-Benz', 'E-Class')
    const letter = MERCEDES_CLASS.exec(m)?.[1]
    return letter ? named('Mercedes-Benz', `${letter.toUpperCase()}-Class`) : null
  }
  if (brand === 'bmw') {
    const series = BMW_SERIES.exec(model.replace(/е/g, 'e'))?.[1]
    return series ? named('BMW', `${series} Series`) : null
  }
  return null
}
