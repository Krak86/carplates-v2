import { catalogPath, localizeRegion, localizeRegistryRows } from '@carplates/shared'
import type { CatalogModel } from '@carplates/shared'

import { DEFAULT_LANG, type Lang } from '../spa/spa-text.js'

/**
 * Server-side text of the catalog pages: the per-page `<title>` / description and the semantic block injected into `#root`
 * for crawlers (the web page renders the same facts, so this is never cloaking). Copy lives here because the API cannot
 * import the web i18n bundles. Fuel, body and colour are localized by `registryLabel` (shared); regions by `localizeRegion`.
 */

type Copy = {
  title: (m: string) => string
  description: (m: string, n: string, years: string) => string
  h1: (m: string) => string
  summary: (m: string, n: string, years: string, fuel: string, region: string) => string
  years: string
  fuel: string
  body: string
  color: string
  regions: string
  cars: string
  models: string
  home: string
}

const COPY: Record<Lang, Copy> = {
  ua: {
    title: m => `${m} в Україні: кількість авто, роки, паливо | Cars UA`,
    description: (m, n, years) =>
      `${m}: ${n} авто на обліку в Україні${years ? `, роки випуску ${years}` : ''}. Паливо, кузов, кольори, регіони, відгуки та вартість на основі відкритих даних реєстру.`,
    h1: m => `${m} в Україні`,
    summary: (m, n, years, fuel, region) =>
      `У реєстрі України зараз ${n} авто ${m}${years ? ` (роки випуску ${years})` : ''}.${fuel ? ` Найпоширеніше паливо: ${fuel}.` : ''}${region ? ` Найбільше таких авто в регіоні: ${region}.` : ''}`,
    years: 'За роком випуску',
    fuel: 'Паливо',
    body: 'Кузов',
    color: 'Колір',
    regions: 'Регіони',
    cars: 'авто',
    models: 'Інші моделі марки',
    home: 'Пошук авто за номером або VIN'
  },
  ru: {
    title: m => `${m} в Украине: количество авто, годы, топливо | Cars UA`,
    description: (m, n, years) =>
      `${m}: ${n} авто на учёте в Украине${years ? `, годы выпуска ${years}` : ''}. Топливо, кузов, цвета, регионы, отзывы и стоимость на основе открытых данных реестра.`,
    h1: m => `${m} в Украине`,
    summary: (m, n, years, fuel, region) =>
      `В реестре Украины сейчас ${n} авто ${m}${years ? ` (годы выпуска ${years})` : ''}.${fuel ? ` Самое распространённое топливо: ${fuel}.` : ''}${region ? ` Больше всего таких авто в регионе: ${region}.` : ''}`,
    years: 'По году выпуска',
    fuel: 'Топливо',
    body: 'Кузов',
    color: 'Цвет',
    regions: 'Регионы',
    cars: 'авто',
    models: 'Другие модели марки',
    home: 'Поиск авто по номеру или VIN'
  },
  en: {
    title: m => `${m} in Ukraine: cars registered, years, fuel | Cars UA`,
    description: (m, n, years) =>
      `${m}: ${n} cars on the road in Ukraine${years ? `, built ${years}` : ''}. Fuel, body, colours, regions, reviews and value from the open vehicle registry.`,
    h1: m => `${m} in Ukraine`,
    summary: (m, n, years, fuel, region) =>
      `Ukraine's registry currently lists ${n} ${m} cars${years ? ` (built ${years})` : ''}.${fuel ? ` The most common fuel: ${fuel}.` : ''}${region ? ` Most of them are registered in: ${region}.` : ''}`,
    years: 'By model year',
    fuel: 'Fuel',
    body: 'Body',
    color: 'Colour',
    regions: 'Regions',
    cars: 'cars',
    models: 'Other models of the make',
    home: 'Look up a car by plate or VIN'
  }
}

const NUMBER_LOCALE: Record<Lang, string> = { ua: 'uk-UA', ru: 'ru-RU', en: 'en-US' }
/** The year table of the injected block lists the biggest years only; the page shows the full range. */
const BLOCK_YEARS = 12
const BLOCK_ROWS = 6

export const catalogName = (m: Pick<CatalogModel, 'makeName' | 'modelName'>): string =>
  `${m.makeName} ${m.modelName}`.trim()

const yearRange = (m: CatalogModel): string =>
  m.yearMin && m.yearMax ? (m.yearMin === m.yearMax ? String(m.yearMin) : `${m.yearMin}-${m.yearMax}`) : ''

const fmt = (n: number, lang: Lang): string => n.toLocaleString(NUMBER_LOCALE[lang])

/** Per-page `<title>` and description (the same `PageText` shape as the static pages). */
export function catalogPageText(m: CatalogModel, lang: Lang): { title: string; description: string } {
  const c = COPY[lang]
  return { title: c.title(catalogName(m)), description: c.description(catalogName(m), fmt(m.n, lang), yearRange(m)) }
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const langQuery = (lang: Lang): string => (lang === DEFAULT_LANG ? '' : `?lang=${lang}`)

const table = (caption: string, rows: [string, number][], total: number, lang: Lang): string =>
  rows.length === 0
    ? ''
    : `<table><caption>${esc(caption)}</caption><tbody>${rows
        .map(
          ([label, n]) =>
            `<tr><th scope="row">${esc(label)}</th><td>${fmt(n, lang)}</td><td>${Math.round((n / total) * 100)}%</td></tr>`
        )
        .join('')}</tbody></table>`

/**
 * The semantic block placed inside `#root` before React mounts: h1, one-paragraph summary, the stats tables and plain
 * links to sibling models (the best crawl discovery). React replaces it on load.
 */
export function catalogSeoBlock(m: CatalogModel, lang: Lang): string {
  const c = COPY[lang]
  const name = catalogName(m)
  const { stats } = m
  const fuel = localizeRegistryRows('fuel', stats.fuel, lang)
  const topFuel = fuel[0]?.[0]
  const regions = stats.regions.map(([name, n]): [string, number] => [localizeRegion(name, lang), n])
  const topRegion = regions[0]?.[0]
  const biggestYears = [...stats.years].sort((a, b) => b[1] - a[1]).slice(0, BLOCK_YEARS)
  const byYear = biggestYears.sort((a, b) => Number(a[0]) - Number(b[0]))
  const links = m.siblings
    .map(
      s =>
        `<li><a href="${esc(catalogPath(m.make, s.model))}${langQuery(lang)}">${esc(`${m.makeName} ${s.modelName}`)}</a></li>`
    )
    .join('')
  return [
    `<main>`,
    `<h1>${esc(c.h1(name))}</h1>`,
    `<p>${esc(c.summary(name, fmt(m.n, lang), yearRange(m), topFuel ?? '', topRegion ?? ''))}</p>`,
    table(c.years, byYear, m.n, lang),
    table(c.fuel, fuel.slice(0, BLOCK_ROWS), m.n, lang),
    table(c.body, localizeRegistryRows('body', stats.body, lang).slice(0, BLOCK_ROWS), m.n, lang),
    table(c.color, localizeRegistryRows('color', stats.color, lang).slice(0, BLOCK_ROWS), m.n, lang),
    table(c.regions, regions.slice(0, BLOCK_ROWS), m.n, lang),
    links ? `<nav><h2>${esc(c.models)}</h2><ul>${links}</ul></nav>` : '',
    `<p><a href="/${langQuery(lang)}">${esc(c.home)}</a></p>`,
    `</main>`
  ].join('')
}

/** Puts the block into the empty `#root` of index.html (React 19 clears it on the first render). */
export function injectRoot(html: string, block: string): string {
  return html.replace(/<div id="root">\s*<\/div>/, `<div id="root">${block}</div>`)
}
