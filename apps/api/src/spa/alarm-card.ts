import { readFileSync } from 'node:fs'

import type { AlarmsResponse, LossesResponse } from '@carplates/shared'

import { FONT_FAMILY, OG_HEIGHT, OG_WIDTH, SITE_URL, background, esc, header, panel } from './og-card.js'
import type { Lang } from './spa-text.js'

/** First day of the full-scale invasion (same date as the web's `WAR_START_DATE`). */
const WAR_START = [2022, 2, 24] as const

/** One oblast outline already projected into card pixels. `o` is the shape's oblast name (as in the geojson). */
export type OblastPath = { o: string; d: string }

type Ring = number[][]
type GeoFeature = { properties: { o: string }; geometry: { type: string; coordinates: unknown } }
type GeoCollection = { features: GeoFeature[] }

/** Plate-region name of a geojson oblast name: the same rule as the web's `regionOfOblast`. */
export const regionOfOblast = (oblast: string): string => {
  if (oblast === 'Автономна Республіка Крим') return 'АР Крим'
  if (oblast === 'Київ' || oblast === 'Севастополь') return oblast
  return `${oblast} область`
}

const ringsOf = (g: GeoFeature['geometry']): Ring[] => {
  if (g.type === 'Polygon') return g.coordinates as Ring[]
  if (g.type === 'MultiPolygon') return (g.coordinates as Ring[][]).flat()
  return []
}

const mercatorY = (lat: number): number => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
const radians = (deg: number): number => (deg * Math.PI) / 180

export const MAP_BOX = { x: 400, y: 30, width: 760, height: 570 }

/** Projects oblast outlines (Web Mercator, like the app's map) into `box`, fitted and centred. Pure: the caller reads the file once. */
export function projectOblasts(collection: GeoCollection, box: typeof MAP_BOX = MAP_BOX): OblastPath[] {
  const rings = collection.features.map(f => ringsOf(f.geometry))
  const all = rings.flat(2)
  if (all.length === 0) return []
  const xs = all.map(p => radians(p[0] as number))
  const ys = all.map(p => mercatorY(p[1] as number))
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const scale = Math.min(box.width / (maxX - minX), box.height / (maxY - minY))
  const offX = box.x + (box.width - (maxX - minX) * scale) / 2
  const offY = box.y + (box.height - (maxY - minY) * scale) / 2
  const px = (lon: number): string => (offX + (radians(lon) - minX) * scale).toFixed(1)
  const py = (lat: number): string => (offY + (maxY - mercatorY(lat)) * scale).toFixed(1)
  return collection.features.map((f, i) => ({
    o: f.properties.o,
    d: (rings[i] as Ring[])
      .map(
        ring => `${ring.map((p, j) => `${j === 0 ? 'M' : 'L'}${px(p[0] as number)} ${py(p[1] as number)}`).join('')}Z`
      )
      .join('')
  }))
}

export const readGeoJson = (path: string): GeoCollection | null => {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as GeoCollection
  } catch {
    return null
  }
}

const FILL_FULL = '#ef4444'
const FILL_YELLOW = '#eab308'
const FILL_NONE = '#334155'

type MapText = { title: string; unit: string; noData: string; updated: string; full: string; partial: string }

const MAP_TEXT: Record<Lang, MapText> = {
  ua: {
    title: 'Мапа повітряних тривог',
    unit: 'областей з тривогою',
    noData: 'Зараз немає даних',
    updated: 'Станом на',
    full: 'уся область',
    partial: 'частина області'
  },
  ru: {
    title: 'Карта воздушных тревог',
    unit: 'областей с тревогой',
    noData: 'Сейчас нет данных',
    updated: 'По состоянию на',
    full: 'вся область',
    partial: 'часть области'
  },
  en: {
    title: 'Air raid alert map',
    unit: 'regions with an alert',
    noData: 'No data right now',
    updated: 'As of',
    full: 'whole region',
    partial: 'part of region'
  }
}

/**
 * The alert-map share card. `alarms` null = the feed is stale or down: the base map is drawn grey with "no data", never as
 * a calm map (fail closed, same rule as the page).
 */
export function buildAlarmMapCardSvg(input: {
  paths: readonly OblastPath[]
  alarms: AlarmsResponse | null
  lang: Lang
  siteIconPng?: Buffer | null
}): string {
  const { alarms } = input
  const text = MAP_TEXT[input.lang]
  const byRegion = new Map((alarms?.regions ?? []).map(r => [r.region, r]))
  const shapes = input.paths
    .map(p => {
      const region = alarms ? byRegion.get(regionOfOblast(p.o)) : undefined
      const fill = !region ? FILL_NONE : region.level === 'Yellow' ? FILL_YELLOW : FILL_FULL
      const opacity = !alarms ? 0.5 : region?.scope === 'partial' ? 0.55 : 1
      return `<path d="${p.d}" fill="${fill}" fill-opacity="${opacity}" stroke="#0f172a" stroke-width="1"/>`
    })
    .join('\n')
  const time = alarms
    ? new Date(alarms.fetchedAt).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Kyiv'
      })
    : ''
  const label = (y: number, size: number, fill: string, value: string, weight = 400): string =>
    `<text x="90" y="${y}" font-family="${FONT_FAMILY}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(value)}</text>`
  // Two lines at the middle word, so the title stays inside the narrow panel.
  const words = text.title.split(' ')
  const half = Math.ceil(words.length / 2)
  const titleLines = [words.slice(0, half).join(' '), words.slice(half).join(' ')]
  const body = alarms
    ? `${label(335, 100, '#fff', String(alarms.regions.length), 700)}
${label(375, 24, '#cbd5e1', text.unit)}
${label(412, 22, '#94a3b8', `${text.updated} ${time}`)}
<rect x="90" y="450" width="22" height="22" rx="4" fill="${FILL_FULL}"/><text x="124" y="468" font-family="${FONT_FAMILY}" font-size="22" fill="#cbd5e1">${esc(text.full)}</text>
<rect x="90" y="484" width="22" height="22" rx="4" fill="${FILL_FULL}" fill-opacity="0.55"/><text x="124" y="502" font-family="${FONT_FAMILY}" font-size="22" fill="#cbd5e1">${esc(text.partial)}</text>`
    : label(320, 34, '#fff', text.noData, 700)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}">${background('blue')}
${shapes}
${header(input.siteIconPng)}
${panel(50, 170, 330, 380)}
${titleLines.map((l, i) => label(220 + i * 34, 28, '#fff', l, 700)).join('\n')}
${body}
${SITE_URL}
</svg>`
}

/** Calendar time from the invasion start to an ISO day: whole years, months and leftover days. Null before the start / bad date. */
export function warDuration(isoDay: string): { years: number; months: number; days: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDay)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  let months = (y - WAR_START[0]) * 12 + (mo - WAR_START[1])
  let days = d - WAR_START[2]
  if (days < 0) {
    months -= 1
    days += new Date(Date.UTC(y, mo - 1, 0)).getUTCDate()
  }
  return months < 0 ? null : { years: Math.floor(months / 12), months: months % 12, days }
}

const LOCALES = { ua: 'uk-UA', ru: 'ru-RU', en: 'en-US' } as const satisfies Record<Lang, string>
const numberFormat = (lang: Lang): Intl.NumberFormat => new Intl.NumberFormat(LOCALES[lang])

const UNITS: Record<Lang, { years: string; months: string; days: string; day: string }> = {
  ua: { years: 'р.', months: 'міс.', days: 'дн.', day: 'День' },
  ru: { years: 'г.', months: 'мес.', days: 'дн.', day: 'День' },
  en: { years: 'y', months: 'mo', days: 'd', day: 'Day' }
}

/** `Day 1,350 · 4 y 8 mo 12 d`: short, so it fits the card subtitle in every language. */
export function warDayLine(lang: Lang, day: number | null, isoDay: string): string {
  const u = UNITS[lang]
  const span = warDuration(isoDay)
  const parts = span
    ? [
        span.years > 0 && `${span.years} ${u.years}`,
        span.months > 0 && `${span.months} ${u.months}`,
        span.days > 0 && `${span.days} ${u.days}`
      ]
    : []
  return [day !== null ? `${u.day} ${numberFormat(lang).format(day)}` : '', parts.filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' · ')
}

/** The six counters on the card (explicit order = presentation). */
export const CARD_LOSSES = [
  'personnel_units',
  'tanks',
  'armoured_fighting_vehicles',
  'artillery_systems',
  'planes',
  'uav_systems'
] as const

const LOSS_NAMES: Record<Lang, Record<(typeof CARD_LOSSES)[number], string>> = {
  ua: {
    personnel_units: 'Особовий склад',
    tanks: 'Танки',
    armoured_fighting_vehicles: 'Бойові броньовані машини',
    artillery_systems: 'Артилерійські системи',
    planes: 'Літаки',
    uav_systems: 'БпЛА'
  },
  ru: {
    personnel_units: 'Личный состав',
    tanks: 'Танки',
    armoured_fighting_vehicles: 'Боевые бронированные машины',
    artillery_systems: 'Артиллерийские системы',
    planes: 'Самолёты',
    uav_systems: 'БпЛА'
  },
  en: {
    personnel_units: 'Personnel',
    tanks: 'Tanks',
    armoured_fighting_vehicles: 'Armoured vehicles',
    artillery_systems: 'Artillery systems',
    planes: 'Aircraft',
    uav_systems: 'UAVs'
  }
}

const LOSSES_TEXT: Record<Lang, { title: string; note: string }> = {
  ua: { title: 'Втрати росії', note: 'Орієнтовні дані Генштабу ЗСУ, не перевірені незалежно' },
  ru: { title: 'Потери россии', note: 'Ориентировочные данные Генштаба ВСУ, независимо не проверены' },
  en: { title: 'Russian losses', note: 'Approximate General Staff figures, not independently verified' }
}

/** Title / description of the losses link preview (the page head, not the card). `data` null = nothing stored yet. */
export function lossesPreviewText(lang: Lang, data: LossesResponse | null): { title: string; description: string } {
  const text = LOSSES_TEXT[lang]
  const people = data?.stats.personnel_units
  return {
    title: `${text.title} | Cars UA`,
    description: [
      data ? warDayLine(lang, data.day, data.date) : '',
      people == null ? '' : `${numberFormat(lang).format(people)} ${LOSS_NAMES[lang].personnel_units.toLowerCase()}`,
      text.note
    ]
      .filter(Boolean)
      .join('. ')
  }
}

/** The war-loss share card: day count with years / months, and the headline counters. A missing counter is "-", never 0. */
export function buildLossesCardSvg(input: { data: LossesResponse; lang: Lang; siteIconPng?: Buffer | null }): string {
  const { data, lang } = input
  const text = LOSSES_TEXT[lang]
  const number = numberFormat(lang)
  const cells = CARD_LOSSES.map((key, i) => {
    const x = 90 + (i % 3) * 350
    const y = 360 + Math.floor(i / 3) * 105
    const total = data.stats[key]
    const inc = data.increase[key]
    const change = inc == null || inc === 0 ? '' : `  ${inc > 0 ? '+' : ''}${number.format(inc)}`
    return `<text x="${x}" y="${y}" font-family="${FONT_FAMILY}" font-size="50" font-weight="700" fill="#fff">${total == null ? '-' : esc(number.format(total))}<tspan font-size="24" font-weight="400" fill="#fca5a5">${esc(change)}</tspan></text>
<text x="${x}" y="${y + 34}" font-family="${FONT_FAMILY}" font-size="24" fill="#cbd5e1">${esc(LOSS_NAMES[lang][key])}</text>`
  }).join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}">${background('blue')}${header(input.siteIconPng)}
${panel(50, 170, 1100, 380)}
<text x="90" y="235" font-family="${FONT_FAMILY}" font-size="44" font-weight="700" fill="#fff">${esc(text.title)}</text>
<text x="90" y="282" font-family="${FONT_FAMILY}" font-size="28" fill="#cbd5e1">${esc(warDayLine(lang, data.day, data.date))}</text>
${cells}
<text x="90" y="536" font-family="${FONT_FAMILY}" font-size="20" fill="#94a3b8">${esc(text.note)}</text>
${SITE_URL}
</svg>`
}
