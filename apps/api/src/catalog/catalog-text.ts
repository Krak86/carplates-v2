import {
  CATALOG_INDEX_PATH,
  catalogMakePath,
  catalogPath,
  localizeRegion,
  localizeRegistryRows
} from '@carplates/shared'
import type { CatalogMake, CatalogMakeSummary, CatalogModel } from '@carplates/shared'

import { langUrl } from '../spa/meta.js'
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
  /** Same wording as the web `catalog.capacityMedian` / `catalog.powerMedian` strings. */
  capacityMedian: (value: string) => string
  powerMedian: (value: string) => string
  cars: string
  models: string
  home: string
  crumbHome: string
  crumbCars: string
  crumbLabel: string
  allOfMake: (make: string) => string
  makeTitle: (make: string) => string
  makeDescription: (make: string, n: string, models: string) => string
  makeSummary: (make: string, n: string, models: string) => string
  modelsHeading: string
  indexH1: string
  indexSummary: (n: string, makes: string) => string
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
    capacityMedian: v => `Типовий об'єм двигуна: ${v} см³`,
    powerMedian: v => `Типова потужність: ${v} кВт`,
    cars: 'авто',
    models: 'Інші моделі марки',
    home: 'Пошук авто за номером або VIN',
    crumbHome: 'Головна',
    crumbCars: 'Каталог авто',
    crumbLabel: 'Навігація',
    allOfMake: make => `Усі моделі ${make}`,
    makeTitle: make => `${make} в Україні: моделі та кількість авто | Cars UA`,
    makeDescription: (make, n, models) =>
      `${make}: ${n} авто на обліку в Україні, моделей: ${models}. Кількість авто за моделями та роки випуску за відкритими даними реєстру.`,
    makeSummary: (make, n, models) => `У реєстрі України зараз ${n} авто ${make}, моделей: ${models}.`,
    modelsHeading: 'Моделі',
    indexH1: 'Авто в Україні за марками',
    indexSummary: (n, makes) =>
      `У реєстрі України зараз ${n} авто, марок: ${makes}. Оберіть марку, щоб побачити її моделі.`
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
    capacityMedian: v => `Типичный объём двигателя: ${v} см³`,
    powerMedian: v => `Типичная мощность: ${v} кВт`,
    cars: 'авто',
    models: 'Другие модели марки',
    home: 'Поиск авто по номеру или VIN',
    crumbHome: 'Главная',
    crumbCars: 'Каталог авто',
    crumbLabel: 'Навигация',
    allOfMake: make => `Все модели ${make}`,
    makeTitle: make => `${make} в Украине: модели и количество авто | Cars UA`,
    makeDescription: (make, n, models) =>
      `${make}: ${n} авто на учёте в Украине, моделей: ${models}. Количество авто по моделям и годы выпуска по открытым данным реестра.`,
    makeSummary: (make, n, models) => `В реестре Украины сейчас ${n} авто ${make}, моделей: ${models}.`,
    modelsHeading: 'Модели',
    indexH1: 'Авто в Украине по маркам',
    indexSummary: (n, makes) =>
      `В реестре Украины сейчас ${n} авто, марок: ${makes}. Выберите марку, чтобы увидеть её модели.`
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
    capacityMedian: v => `Typical engine size: ${v} cc`,
    powerMedian: v => `Typical power: ${v} kW`,
    cars: 'cars',
    models: 'Other models of the make',
    home: 'Look up a car by plate or VIN',
    crumbHome: 'Home',
    crumbCars: 'Cars',
    crumbLabel: 'Breadcrumb',
    allOfMake: make => `All ${make} models`,
    makeTitle: make => `${make} in Ukraine: models and cars registered | Cars UA`,
    makeDescription: (make, n, models) =>
      `${make}: ${n} cars on the road in Ukraine across ${models} models. Cars per model and model years from the open vehicle registry.`,
    makeSummary: (make, n, models) => `Ukraine's registry currently lists ${n} ${make} cars across ${models} models.`,
    modelsHeading: 'Models',
    indexH1: 'Cars in Ukraine by make',
    indexSummary: (n, makes) =>
      `Ukraine's registry currently lists ${n} cars of ${makes} makes. Pick a make to see its models.`
  }
}

const NUMBER_LOCALE: Record<Lang, string> = { ua: 'uk-UA', ru: 'ru-RU', en: 'en-US' }
/** The year table of the injected block lists the biggest years only; the page shows the full range. */
const BLOCK_YEARS = 12
const BLOCK_ROWS = 6

type Crumb = { name: string; path: string }

/** Home > Cars > make > model: the trail of every catalog page (the last crumb is the page itself). */
export function catalogCrumbs(
  lang: Lang,
  make?: { slug: string; name: string },
  model?: { name: string; path: string }
): Crumb[] {
  const c = COPY[lang]
  return [
    { name: c.crumbHome, path: '/' },
    { name: c.crumbCars, path: CATALOG_INDEX_PATH },
    ...(make ? [{ name: make.name, path: catalogMakePath(make.slug) }] : []),
    ...(model ? [model] : [])
  ]
}

/** `BreadcrumbList` JSON-LD for the page head (absolute URLs in the page's language). */
export function breadcrumbJsonLd(siteUrl: string, crumbs: Crumb[], lang: Lang): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: langUrl(siteUrl, c.path === '/' ? '' : c.path, lang)
    }))
  }
}

/**
 * `Car` JSON-LD of a model page: the model's name and make plus its typical (most common) fuel, body and engine from the
 * registry. It describes the model, not a car for sale, so there are no offers.
 */
export function catalogCarJsonLd(siteUrl: string, m: CatalogModel, lang: Lang): object {
  const { stats } = m
  const fuel = localizeRegistryRows('fuel', stats.fuel, lang)[0]?.[0]
  const body = localizeRegistryRows('body', stats.body, lang)[0]?.[0]
  const engine = {
    ...(stats.capacityP50
      ? { engineDisplacement: { '@type': 'QuantitativeValue', value: stats.capacityP50, unitCode: 'CMQ' } }
      : {}),
    ...(stats.powerP50 ? { enginePower: { '@type': 'QuantitativeValue', value: stats.powerP50, unitCode: 'KWT' } } : {})
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: catalogName(m),
    url: langUrl(siteUrl, catalogPath(m.make, m.model), lang),
    brand: { '@type': 'Brand', name: m.makeName },
    model: m.modelName,
    ...(fuel ? { fuelType: fuel } : {}),
    ...(body ? { bodyType: body } : {}),
    ...(Object.keys(engine).length ? { vehicleEngine: { '@type': 'EngineSpecification', ...engine } } : {})
  }
}

export const catalogName = (m: Pick<CatalogModel, 'makeName' | 'modelName'>): string =>
  `${m.makeName} ${m.modelName}`.trim()

/** The trail of a model page. */
export const catalogModelCrumbs = (m: CatalogModel, lang: Lang): Crumb[] =>
  catalogCrumbs(lang, { slug: m.make, name: m.makeName }, { name: m.modelName, path: catalogPath(m.make, m.model) })

const yearsOf = (min: number | null, max: number | null): string =>
  min && max ? (min === max ? String(min) : `${min}-${max}`) : ''

const yearRange = (m: CatalogModel): string => yearsOf(m.yearMin, m.yearMax)

const fmt = (n: number, lang: Lang): string => n.toLocaleString(NUMBER_LOCALE[lang])

/** Per-page `<title>` and description (the same `PageText` shape as the static pages). */
export function catalogPageText(m: CatalogModel, lang: Lang): { title: string; description: string } {
  const c = COPY[lang]
  return { title: c.title(catalogName(m)), description: c.description(catalogName(m), fmt(m.n, lang), yearRange(m)) }
}

/** `<title>` and description of a `/cars/:make` page. */
export function catalogMakePageText(m: CatalogMake, lang: Lang): { title: string; description: string } {
  const c = COPY[lang]
  return {
    title: c.makeTitle(m.makeName),
    description: c.makeDescription(m.makeName, fmt(m.n, lang), fmt(m.modelCount, lang))
  }
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const langQuery = (lang: Lang): string => (lang === DEFAULT_LANG ? '' : `?lang=${lang}`)

/** Plain-link trail; the last crumb is the page itself, so it is text. */
const breadcrumbNav = (crumbs: Crumb[], lang: Lang): string =>
  `<nav aria-label="${esc(COPY[lang].crumbLabel)}"><ol>${crumbs
    .map((c, i) =>
      i === crumbs.length - 1
        ? `<li>${esc(c.name)}</li>`
        : `<li><a href="${esc(c.path)}${langQuery(lang)}">${esc(c.name)}</a></li>`
    )
    .join('')}</ol></nav>`

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
 * The semantic block placed inside `#root` before React mounts: trail, h1, one-paragraph summary, the stats tables and
 * plain links to the make and its sibling models (the best crawl discovery). React replaces it on load.
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
  const engine = [
    stats.capacityP50 ? c.capacityMedian(fmt(stats.capacityP50, lang)) : null,
    stats.powerP50 ? c.powerMedian(fmt(stats.powerP50, lang)) : null
  ]
    .filter(Boolean)
    .join(' · ')
  const makeLink = `<li><a href="${esc(catalogMakePath(m.make))}${langQuery(lang)}">${esc(c.allOfMake(m.makeName))}</a></li>`
  const links = m.siblings
    .map(
      s =>
        `<li><a href="${esc(catalogPath(m.make, s.model))}${langQuery(lang)}">${esc(`${m.makeName} ${s.modelName}`)}</a></li>`
    )
    .join('')
  return [
    `<main>`,
    breadcrumbNav(catalogModelCrumbs(m, lang), lang),
    `<h1>${esc(c.h1(name))}</h1>`,
    `<p>${esc(c.summary(name, fmt(m.n, lang), yearRange(m), topFuel ?? '', topRegion ?? ''))}</p>`,
    table(c.years, byYear, m.n, lang),
    table(c.fuel, fuel.slice(0, BLOCK_ROWS), m.n, lang),
    table(c.body, localizeRegistryRows('body', stats.body, lang).slice(0, BLOCK_ROWS), m.n, lang),
    table(c.color, localizeRegistryRows('color', stats.color, lang).slice(0, BLOCK_ROWS), m.n, lang),
    table(c.regions, regions.slice(0, BLOCK_ROWS), m.n, lang),
    engine ? `<p>${esc(engine)}</p>` : '',
    `<nav><h2>${esc(c.models)}</h2><ul>${makeLink}${links}</ul></nav>`,
    `<p><a href="/${langQuery(lang)}">${esc(c.home)}</a></p>`,
    `</main>`
  ].join('')
}

/** The block of `/cars/:make`: trail, h1, summary and a plain link to every model page of the make. */
export function catalogMakeSeoBlock(m: CatalogMake, lang: Lang): string {
  const c = COPY[lang]
  const items = m.models
    .map(x => {
      const years = yearsOf(x.yearMin, x.yearMax)
      return `<li><a href="${esc(catalogPath(m.make, x.model))}${langQuery(lang)}">${esc(`${m.makeName} ${x.modelName}`)}</a> - ${fmt(x.n, lang)} ${esc(c.cars)}${years ? ` (${years})` : ''}</li>`
    })
    .join('')
  return [
    '<main>',
    breadcrumbNav(catalogCrumbs(lang, { slug: m.make, name: m.makeName }), lang),
    `<h1>${esc(c.h1(m.makeName))}</h1>`,
    `<p>${esc(c.makeSummary(m.makeName, fmt(m.n, lang), fmt(m.modelCount, lang)))}</p>`,
    `<h2>${esc(c.modelsHeading)}</h2><ul>${items}</ul>`,
    `<p><a href="/${langQuery(lang)}">${esc(c.home)}</a></p>`,
    '</main>'
  ].join('')
}

/** The block of `/cars`: trail, h1, summary and a plain link to every make. */
export function catalogIndexSeoBlock(makes: CatalogMakeSummary[], lang: Lang): string {
  const c = COPY[lang]
  const total = makes.reduce((sum, m) => sum + m.n, 0)
  const items = makes
    .map(
      m =>
        `<li><a href="${esc(catalogMakePath(m.make))}${langQuery(lang)}">${esc(m.makeName)}</a> - ${fmt(m.n, lang)} ${esc(c.cars)}</li>`
    )
    .join('')
  return [
    '<main>',
    breadcrumbNav(catalogCrumbs(lang), lang),
    `<h1>${esc(c.indexH1)}</h1>`,
    `<p>${esc(c.indexSummary(fmt(total, lang), fmt(makes.length, lang)))}</p>`,
    `<ul>${items}</ul>`,
    `<p><a href="/${langQuery(lang)}">${esc(c.home)}</a></p>`,
    '</main>'
  ].join('')
}

/** Puts the block into the empty `#root` of index.html (React 19 clears it on the first render). */
export function injectRoot(html: string, block: string): string {
  return html.replace(/<div id="root">\s*<\/div>/, `<div id="root">${block}</div>`)
}
