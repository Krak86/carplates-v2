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
export function wikiSearchName(brand: string, model: string): WikiSearchName | null {
  if (VAZ_BRANDS.has(brand)) return vazAlias(model)
  if (ZAZ_BRANDS.has(brand)) return zazAlias(model)
  if (brand === 'азлк' || brand === 'москвич')
    return model.startsWith('2141') ? named('Moskvich', '2141', 'Москвич-2141') : null
  if (brand === 'mercedes-benz') {
    const letter = MERCEDES_CLASS.exec(model)?.[1]
    return letter ? named('Mercedes-Benz', `${letter.toUpperCase()}-Class`) : null
  }
  if (brand === 'bmw') {
    const series = BMW_SERIES.exec(model)?.[1]
    return series ? named('BMW', `${series} Series`) : null
  }
  return null
}
