/**
 * Registry model → searchable name for the Wikimedia photo pre-warm. The registry stores factory indexes (`21104`,
 * `110307-42`, `T13110`) and engine-code names (`E 270 CDI`, `116 i`) that Commons / Wikipedia know under a marketing
 * name (VAZ-2110, ZAZ Slavuta, Mercedes-Benz E-Class). Rows stay keyed by the registry brand/model; only the search
 * and the title matching use the alias.
 */

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
  return null
}

function zazAlias(model: string): WikiSearchName | null {
  const m = model.toLowerCase()
  if (m.startsWith('t13110')) return named('ZAZ', 'Sens', 'ЗАЗ Сенс')
  if (/^1102/.test(m)) return named('ZAZ', 'Tavria', 'ЗАЗ-1102 Таврія')
  if (/^1103/.test(m)) return named('ZAZ', 'Slavuta', 'ЗАЗ-1103 Славута')
  if (/^1105/.test(m)) return named('ZAZ', 'Dana', 'ЗАЗ-1105 Дана')
  if (/^tf69/.test(m)) return named('ZAZ', 'Chance', 'ЗАЗ Шанс')
  return null
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
  return base ? named(brand, base.replace(/^nuovo /, '')) : null
}

const ENGINE_SIZE_SUFFIX = /^(.*?[a-zа-я0-9])\s+\d\.\d.*$/

function brandAlias(brand: string, model: string): WikiSearchName | null {
  if (brand === 'geely') {
    if (model.replace(/\s/g, '-').startsWith('mr-7151')) return named('Geely', 'MK')
    if (model === 'mk cross') return named('Geely', 'MK Cross')
  }
  if (brand === 'газ') {
    if (model.startsWith('2410')) return named('GAZ', '24', 'ГАЗ-24 Волга')
    if (model.startsWith('2705')) return named('GAZ', 'Gazelle', 'ГАЗель')
    if (model.startsWith('2752')) return named('GAZ', 'Sobol', 'ГАЗ Соболь')
  }
  if (brand === 'уаз' && (model.startsWith('3909') || model.startsWith('3962'))) return named('UAZ', '452', 'УАЗ-452')
  if (brand === 'луаз' && model.startsWith('969')) return named('LuAZ', '969', 'ЛуАЗ-969')
  if (brand === 'иж' && model.startsWith('412')) return named('Moskvich', '412', 'Москвич-412')
  if (brand === 'smart' && model === 'mc 01') return named('Smart', 'Fortwo')
  if (brand === 'chevrolet' && model === 'evanda') return named('Daewoo', 'Evanda')
  if (brand === 'renault' && model === 'megane scenic') return named('Renault', 'Scenic')
  if (brand === 'byd' && model === 'f-3') return named('BYD', 'F3')
  if (brand === 'infiniti' && /^fx\s?\d{2}$/.test(model)) return named('Infiniti', 'FX')
  if (brand === 'volkswagen' && model === 'lt 35') return named('Volkswagen', 'LT')
  if (brand === 'daewoo' || brand === 'fso') {
    if (model.startsWith('t13110')) return named('ZAZ', 'Sens', 'ЗАЗ Сенс')
    if (model.includes('lanos')) return named('Daewoo', 'Lanos')
  }
  if (brand === 'lexus') {
    const lexus = /^(rx|es|is|gs|nx|ls|lx|gx|ux)\s?\d{3}/.exec(model)?.[1]
    return lexus ? named('Lexus', lexus.toUpperCase()) : null
  }
  if (brand === 'kia' && model === 'magentis') return named('Kia', 'Optima', 'Kia Magentis')
  if (brand === 'mitsubishi' && model === 'l 200') return named('Mitsubishi', 'L200')
  if (brand === 'suzuki' && model === 'new sx4') return named('Suzuki', 'SX4')
  if (VAZ_BRANDS.has(brand)) return vazAlias(model)
  if (ZAZ_BRANDS.has(brand)) return zazAlias(model)
  if (brand === 'азлк' || brand === 'москвич')
    return model.startsWith('2141') ? named('Moskvich', '2141', 'Москвич-2141') : null
  if (brand === 'mercedes-benz') {
    if (/^(ml|gl)\s?\d{2,3}/.test(model)) return named('Mercedes-Benz', model.startsWith('ml') ? 'M-Class' : 'GL-Class')
    if (/^3\d{2}\s?cdi/.test(model)) return named('Mercedes-Benz', 'Sprinter')
    const letter = MERCEDES_CLASS.exec(model)?.[1]
    return letter ? named('Mercedes-Benz', `${letter.toUpperCase()}-Class`) : null
  }
  if (brand === 'bmw') {
    const series = BMW_SERIES.exec(model)?.[1]
    return series ? named('BMW', `${series} Series`) : null
  }
  return null
}
