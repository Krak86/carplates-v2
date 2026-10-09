import { brandLogoUrl } from '@carplates/shared'
import { CURRENCIES, valueCurve } from '@carplates/shared'
import type {
  CncapRatingsResponse,
  EuroNcapRatingsResponse,
  FuelEconomyResponse,
  FxResponse,
  IihsRatingsResponse,
  JncapRatingsResponse,
  KncapRatingsResponse,
  RdwResponse,
  Registration,
  ReviewsResponse,
  SafetyRatingsResponse,
  StatsTopResponse,
  VdbResponse,
  VehiclePhoto,
  WikiInfo
} from '@carplates/shared'

import { formatRange } from '@/components/CO2Badge.helpers'
import {
  formatEur,
  formatMoney,
  formatMoneyRange,
  riaSearchUrl,
  ukrPrice,
  valueInfoLines,
  valueWarnings
} from '@/components/EstimatedValue.helpers'
import { orderedEditions } from '@/components/PressReviews.helpers'
import { decileBand, isRareElsewhere } from '@/components/VdbChips.helpers'
import {
  altFigure,
  appliesToFuel,
  approxCount,
  describeRange,
  formatPercent as formatShare,
  SHARE_ROWS,
  SPEC_ROWS,
  visibleShares
} from '@/components/RdwSpecs.helpers'
import { infocarLinks, yearFilterLabel } from '@/components/ReviewLinks.helpers'
import { countryName } from '@/components/vin/helpers'
import type { Bilingual } from '@/components/vin/vin-text'
import { safetyVideoUrl } from '@/lib/api'
import { plateRegionLabel } from '@/lib/plate-region'
import {
  filterByBodyStyle,
  formatPercent,
  groupIihsRatings,
  iihsBodyBucket,
  nhtsaBodyBucket
} from '@/components/SafetyRatings.helpers'
import { rankingBadges } from '@/routes/stats/helpers'

/** Loosely-typed `t` so this module doesn't have to fight i18next's generic overloads. */
export type Translate = (key: string, options?: Record<string, unknown>) => string

export const EXPORT_FORMATS = ['clipboard', 'txt', 'md', 'csv', 'docx', 'pdf'] as const
export type ExportFormat = (typeof EXPORT_FORMATS)[number]

// Their libraries (export-* chunks) are deliberately left out of the service worker precache — see vite.config.ts.
export const ONLINE_ONLY_EXPORT_FORMATS: readonly ExportFormat[] = ['docx', 'pdf']

export const EXPORT_FORMAT_LABEL_KEYS: Readonly<Record<ExportFormat, string>> = {
  clipboard: 'export.copyClipboard',
  txt: 'export.downloadTxt',
  md: 'export.downloadMd',
  csv: 'export.downloadCsv',
  docx: 'export.downloadDocx',
  pdf: 'export.downloadPdf'
}

export type ExportKeyValueSection = {
  type: 'kv'
  id: string
  title: string
  rows: { label: string; value: string }[]
}

export type ExportTableSection = {
  type: 'table'
  id: string
  title: string
  /** The "what do these numbers mean" explainer normally behind a ❓ button next to this table. */
  note?: string
  columns: string[]
  rows: string[][]
}

export type ExportLinksSection = {
  type: 'links'
  id: string
  title: string
  links: { label: string; url: string }[]
}

export type ExportTextSection = {
  type: 'text'
  id: string
  title: string
  paragraphs: string[]
}

/** A line chart. Text formats print `columns`/`rows` (the plotted data); Word and PDF draw `points` as a picture. */
export type ExportChartSection = {
  type: 'chart'
  id: string
  title: string
  note?: string
  columns: string[]
  rows: string[][]
  points: { x: number; y: number }[]
  /** The car's own position on the curve, with its low–high bar when known. */
  mark?: { x: number; y: number; low?: number; high?: number }
  /** Axis end labels, already formatted. */
  xMinLabel: string
  xMaxLabel: string
  yMaxLabel: string
}

export type ExportSection =
  ExportKeyValueSection | ExportTableSection | ExportLinksSection | ExportTextSection | ExportChartSection

export type ExportReport = {
  title: string
  subtitle: string
  /** Bundled brand logo (same-origin `/logos/*.png`), null for a brand with none. */
  logo: { url: string; alt: string } | null
  /** Wikipedia lead image, shown right under the title block when the wiki lookup found one. */
  heroImage: { url: string; alt: string } | null
  generatedAtLabel: string
  sections: ExportSection[]
}

export type ExportVehicleInfo = { brand: string | null; model: string | null; year: number | null; body: string | null }

export type ExportInput = {
  vehicle: ExportVehicleInfo
  plate: string | null
  region: string | null
  /** The vehicle's latest known registration row, when we have one (null for a VIN with no registry match). */
  current: Registration | null
  vin: string | null
  vinDecodeResults: { variable: string; value: string }[] | null
  plateHistoryActions: Registration[] | null
  vinHistoryActions: Registration[] | null
  wiki: WikiInfo | null
  /** Fuel/CO2 estimate for similar vehicles — the same data the ResultCard's "Emissions" section shows. */
  fuel: FuelEconomyResponse | null
  photos: VehiclePhoto[]
  euroncap: EuroNcapRatingsResponse | null
  nhtsa: SafetyRatingsResponse | null
  jncap: JncapRatingsResponse | null
  cncap: CncapRatingsResponse | null
  kncap: KncapRatingsResponse | null
  iihs: IihsRatingsResponse | null
  /** Same rollup TopStatBadges reads on the result card — backs the "Rankings" section below. */
  stats: StatsTopResponse | null
  /** Dutch-register specs (RDW) for the make/model/year — the "Specs" section. */
  rdw: RdwResponse | null
  /** VehiclesDB cross-market facts — the chips beside the title. */
  vdb: VdbResponse | null
  /** infocar / press / TopGear / e-drive catalog — the "Reviews" and "Videos" sections. */
  reviews: ReviewsResponse | null
  /** NBU rates for the currency rows of the price section; null = euros only. */
  fx: FxResponse | null
  /** The VIN section's NHTSA localizer (labels / values in the UI language); absent = raw English. */
  vinText?: { label: (variable: string) => Bilingual; value: (variable: string, raw: string) => Bilingual }
  /** UI language code (ua / ru / en): localizes country names, number grouping and press editions. */
  lang: string
}

type Row = { label: string; value: string }

function pushRow(rows: Row[], label: string, value: string | number | null | undefined): void {
  if (value == null || value === '') return
  rows.push({ label, value: String(value) })
}

function buildVehicleSection(input: ExportInput, t: Translate): ExportKeyValueSection | null {
  const rows: Row[] = []
  const c = input.current

  pushRow(rows, t('export.plate'), input.plate)
  pushRow(rows, t('result.region'), input.region)

  if (c) {
    pushRow(rows, t('field.brandModel'), [c.brand, c.model].filter(Boolean).join(' ') || null)
    pushRow(rows, t('field.year'), c.makeYear)
    pushRow(rows, t('field.body'), c.body)
    if (c.capacity != null) pushRow(rows, t('field.capacity'), c.capacity)
    if (c.capacity == null || c.powerKwt != null) pushRow(rows, t('field.power'), c.powerKwt)
    pushRow(rows, t('field.color'), c.color)
    pushRow(rows, t('field.fuel'), c.fuel)
    pushRow(rows, t('field.weight'), c.ownWeight != null ? `${c.ownWeight} / ${c.totalWeight ?? '—'}` : null)
    pushRow(rows, t('field.kind'), c.kind)
    pushRow(rows, t('field.purpose'), c.purpose)
    pushRow(
      rows,
      t('field.owner'),
      c.person === 'P' ? t('field.ownerPrivate') : c.person ? t('field.ownerCompany') : null
    )
    pushRow(rows, t('field.regDate'), c.dReg)
    pushRow(rows, t('field.dep'), c.dep)
    pushRow(rows, t('field.koatuu'), c.regAddrKoatuu)
    pushRow(rows, t('field.vin'), c.vin ?? input.vin)
    if (c.plateInferred) pushRow(rows, t('result.plateInferred'), t('result.plateInferredHint'))
  } else {
    pushRow(rows, t('field.brandModel'), [input.vehicle.brand, input.vehicle.model].filter(Boolean).join(' ') || null)
    pushRow(rows, t('field.year'), input.vehicle.year)
    pushRow(rows, t('field.vin'), input.vin)
  }

  if (rows.length === 0) return null
  return { type: 'kv', id: 'vehicle', title: t('export.sectionVehicle'), rows }
}

/** Mirrors the ResultCard's TopStatBadges — same leaderboards, same rank source. */
function buildRankingsSection(input: ExportInput, t: Translate): ExportTextSection | null {
  const stats = input.stats
  if (!stats) return null

  const badges = rankingBadges(stats, {
    brand: input.vehicle.brand,
    model: input.vehicle.model,
    color: input.current?.color ?? null,
    region: input.region
  })

  if (badges.length === 0) return null
  return {
    type: 'text',
    id: 'rankings',
    title: t('export.sectionRankings'),
    paragraphs: badges.map(b => `${b.icon} ${t(b.textKey, { rank: b.rank })}`)
  }
}

/** "Локалізований (English)" — the same pairing the VIN section shows, flattened to text. */
function withEnglish({ text, en }: Bilingual): string {
  return en ? `${text} (${en})` : text
}

function buildVinDecodeSection(input: ExportInput, t: Translate): ExportKeyValueSection | null {
  if (!input.vinDecodeResults || input.vinDecodeResults.length === 0) return null
  return {
    type: 'kv',
    id: 'vinDecode',
    title: t('vin.title'),
    rows: input.vinDecodeResults.map(r => {
      const text = input.vinText
      return text
        ? { label: withEnglish(text.label(r.variable)), value: withEnglish(text.value(r.variable, r.value)) }
        : { label: r.variable, value: r.value }
    })
  }
}

function historyRow(action: Registration, t: Translate): string[] {
  const region = plateRegionLabel(action.plate, t)
  return [
    action.dReg ?? '—',
    action.plate ?? '—',
    region,
    action.dep ?? '—',
    [action.brand, action.model].filter(Boolean).join(' ') || '—',
    action.makeYear != null ? String(action.makeYear) : '—',
    action.operName ?? '—'
  ]
}

function historyColumns(t: Translate): string[] {
  return [
    t('field.regDate'),
    t('export.plate'),
    t('result.region'),
    t('field.dep'),
    t('field.brandModel'),
    t('field.year'),
    t('export.operation')
  ]
}

function buildHistorySection(
  id: string,
  title: string,
  actions: Registration[] | null,
  t: Translate
): ExportTableSection | null {
  if (!actions || actions.length === 0) return null
  return { type: 'table', id, title, columns: historyColumns(t), rows: actions.map(a => historyRow(a, t)) }
}

function buildEmissionsSection(input: ExportInput, t: Translate): ExportKeyValueSection | null {
  const e = input.fuel?.estimate
  if (!e) return null
  const rows: Row[] = []
  pushRow(rows, t('co2.unitGKm'), formatRange(e.co2GKmMin, e.co2GKmMax))
  pushRow(rows, t('co2.unitL100'), formatRange(e.l100kmMin, e.l100kmMax, 1))
  pushRow(rows, t('co2.unitKwh100'), e.evKwh100km)
  pushRow(rows, t('co2.cycleNote', { cycle: e.cycle }), e.source)
  pushRow(rows, t('co2.similar'), t('co2.infoEstimate'))
  return { type: 'kv', id: 'emissions', title: t('co2.title'), rows }
}

function buildVdbSection(input: ExportInput, t: Translate): ExportKeyValueSection | null {
  const match = input.vdb?.match
  if (!match) return null
  const nameOf = (code: string): string => countryName(code.toUpperCase(), input.lang)
  const others = match.countries.filter(c => c !== 'ua')
  const aliases = match.aliases ?? []
  const otherNames = [...(match.crossMake ? [`${match.makeName} ${match.modelName}`] : []), ...aliases]
  const rows: Row[] = []
  pushRow(rows, t('export.catalogModel'), `${match.makeName} ${match.modelName}`)
  pushRow(rows, t('export.vdbAliases'), otherNames.join(', '))
  if (match.uaOnly) pushRow(rows, t('export.vdbMarkets'), t('vdb.uaOnly'))
  else pushRow(rows, t('vdb.alsoSold'), others.map(nameOf).join(', '))
  if (match.globalDecile != null && !match.uaOnly) {
    pushRow(
      rows,
      t('export.vdbPopularity'),
      t('vdb.decile', { band: decileBand(match.globalDecile), count: match.countries.length })
    )
  }
  if (isRareElsewhere(match.globalDecile, match.uaOnly)) pushRow(rows, t('export.vdbRare'), t('vdb.rare'))
  pushRow(rows, t('export.source'), t('vdb.info.credit'))
  return { type: 'kv', id: 'vdb', title: t('vdb.info.title'), rows }
}

/** Mirrors RdwSpecs: the same rows, powertrain filtering and units, as "typical value [min–max]" text. */
function buildRdwSection(input: ExportInput, t: Translate): ExportKeyValueSection | null {
  const match = input.rdw?.match
  if (!match) return null
  const { specs } = match
  const locale = input.lang === 'ua' ? 'uk' : input.lang
  const rows: Row[] = []
  pushRow(rows, t('export.catalogModel'), `${match.makeName} ${match.modelName}`)
  pushRow(rows, t('rdw.market'), t('rdw.sampleBadge', { n: approxCount(specs.n, locale), year: specs.year }))

  for (const def of SPEC_ROWS) {
    if (!appliesToFuel(def.powertrain, input.current?.fuel)) continue
    const range = def.pick(specs)
    if (!range) continue
    const { grouped, ...format } = def.format ?? {}
    const { main, spread } = describeRange(range, { ...format, locale: grouped ? locale : undefined })
    const unit = def.unitKey ? ` ${t(def.unitKey)}` : ''
    const alt = def.alt ? ` (${altFigure(def.alt, range.median, t)})` : ''
    pushRow(rows, t(`rdw.${def.key}`), `${main}${unit}${alt}${spread ? ` [${spread}]` : ''}`)
  }

  for (const def of SHARE_ROWS) {
    const items = visibleShares(def.pick(specs), def.limit)
    if (items.length === 0) continue
    const chips = items.map(i => {
      const label = def.itemPrefix ? t(`rdw.${def.itemPrefix}.${i.key}`, { defaultValue: i.key }) : i.key
      return `${label} ${formatShare(i.share)}`
    })
    pushRow(rows, t(`rdw.${def.key}`), chips.join(', '))
  }

  pushRow(rows, t('export.source'), t('rdw.info.credit'))
  return { type: 'kv', id: 'rdw', title: t('rdw.title'), rows }
}

/**
 * Mirrors the "Est. value" chip and its panel: EU value + Ukrainian customs breakdown (kv), the two charts, the
 * per-fuel price table and the full explanation — everything behind the chip's chevron and "?".
 */
function buildPriceSections(input: ExportInput, t: Translate): ExportSection[] {
  const match = input.rdw?.match
  const estimate = match?.valueEstimate
  const makeYear = input.vehicle.year
  if (!match || !estimate || !makeYear) return []

  const locale = input.lang === 'ua' ? 'uk' : input.lang
  const fx = input.fx
  const currencies = fx ? CURRENCIES : (['EUR'] as const)
  const car = { fuel: input.current?.fuel, capacityCc: input.current?.capacity, makeYear }
  const price = ukrPrice(match, estimate, car, new Date().getFullYear())
  const mid = price.mid
  const euros = (v: number): string => `€ ${formatMoney(v, 'EUR', null, locale)}`
  const sections: ExportSection[] = []

  const rows: Row[] = []
  for (const cur of currencies) {
    pushRow(rows, `${t('value.ua.eu')} (${cur})`, formatMoneyRange(estimate.lowEur, estimate.highEur, cur, fx, locale))
  }
  for (const cur of currencies) {
    pushRow(
      rows,
      `${t('value.ua.total')} (${cur})`,
      formatMoneyRange(price.low.totalEur, price.high.totalEur, cur, fx, locale)
    )
  }
  pushRow(rows, t('value.ua.base'), euros(mid.baseEur))
  pushRow(rows, t('value.ua.duty', { percent: 10 }), `+ ${euros(mid.dutyEur)}`)
  pushRow(rows, t('value.ua.excise', { k: mid.ageK }), mid.exciseKnown ? `+ ${euros(mid.exciseEur)}` : '?')
  pushRow(rows, t('value.ua.vat', { percent: 20 }), `+ ${euros(mid.vatEur)}`)
  pushRow(rows, t('value.ua.total'), euros(mid.totalEur))
  if (fx) {
    pushRow(
      rows,
      t('value.ua.currency'),
      t('value.ua.rate', {
        eur: fx.eurUah.toFixed(2),
        usd: fx.usdUah.toFixed(2),
        date: new Date(fx.date).toLocaleDateString(locale)
      })
    )
  }
  pushRow(rows, t('value.ua.ria'), riaSearchUrl(match.makeName, match.modelName, makeYear))
  sections.push({ type: 'kv', id: 'value', title: t('value.title'), rows })

  const newPrice = estimate.newPriceEur ?? match.specs.priceEur?.median
  const byYear = match.priceByYear ?? []
  if (byYear.length >= 2) {
    const points = byYear.map(p => ({ x: p.year, y: p.priceEur }))
    sections.push({
      type: 'chart',
      id: 'valueNewPrice',
      title: t('value.chart.newPrice'),
      columns: [t('field.year'), t('value.fuel.newPrice')],
      rows: byYear.map(p => [String(p.year), eur(p.priceEur, locale)]),
      points,
      mark: newPrice != null ? { x: match.specs.year, y: newPrice } : undefined,
      xMinLabel: String(Math.min(...points.map(p => p.x))),
      xMaxLabel: String(Math.max(...points.map(p => p.x))),
      yMaxLabel: eur(Math.max(...points.map(p => p.y)), locale)
    })
  }

  const curve = newPrice != null ? valueCurve(newPrice, 20) : []
  if (curve.length >= 2) {
    const points = curve.map(p => ({ x: p.ageYears, y: p.valueEur }))
    const thisCar = [
      t('export.thisCar', { age: estimate.ageYears }),
      `${eur(estimate.lowEur, locale)}–${eur(estimate.highEur, locale)} (~${eur(estimate.midEur, locale)})`
    ]
    sections.push({
      type: 'chart',
      id: 'valueByAge',
      title: t('value.chart.byAge'),
      columns: [t('export.age'), t('value.fuel.value')],
      rows: [...curve.map(p => [t('value.chart.ageTick', { age: p.ageYears }), eur(p.valueEur, locale)]), thisCar],
      points,
      mark: { x: estimate.ageYears, y: estimate.midEur, low: estimate.lowEur, high: estimate.highEur },
      xMinLabel: t('value.chart.ageTick', { age: points[0]!.x }),
      xMaxLabel: t('value.chart.ageTick', { age: points[points.length - 1]!.x }),
      yMaxLabel: eur(Math.max(...points.map(p => p.y)), locale)
    })
  }

  const fuels = match.priceByFuel ?? []
  if (fuels.length >= 2) {
    sections.push({
      type: 'table',
      id: 'valueFuel',
      title: t('value.fuel.title'),
      note: t('value.fuel.note'),
      columns: [t('value.fuel.version'), t('value.fuel.newPrice'), t('value.fuel.value')],
      rows: fuels.map(f => [
        `${t(`rdw.fuel.${f.fuel}`, { defaultValue: f.fuel })} (${f.n})`,
        euros(f.priceEur),
        `~ ${euros(f.priceEur * estimate.retained)}`
      ])
    })
  }

  const warnings = [
    t('value.warn.notPrice'),
    ...valueWarnings(match, estimate, price, input.current?.fuel).map(w => t(`value.warn.${w.key}`, w.values))
  ].map(w => `⚠️ ${w}`)
  sections.push({
    type: 'text',
    id: 'valueInfo',
    title: t('value.details.title'),
    paragraphs: [t('value.ua.mid'), ...valueInfoLines(match, estimate, locale, t), ...warnings]
  })

  return sections
}

function eur(v: number, locale: string): string {
  return formatEur(v, locale)
}

/** Mirrors ReviewLinks: one table over every text-review source (links only, as on the card). */
function buildReviewsSection(input: ExportInput, t: Translate): ExportTableSection | null {
  const data = input.reviews
  if (!data) return null
  const rows: string[][] = []

  const infocar: [string, ReviewsResponse['testDrive']][] = [
    [t('reviews.infocarTestDrives'), data.testDrive],
    [t('reviews.infocarOwnerReviews'), data.reviews]
  ]
  for (const [label, match] of infocar) {
    if (!match) continue
    const hasStats = match.level !== 'brand' && match.reviewCount !== null && match.avgRating !== null
    const stats = hasStats ? t('reviews.stats', { count: match.reviewCount, rating: match.avgRating?.toFixed(1) }) : '—'
    const years = yearFilterLabel(match.yearUrl)
    if (match.yearUrl && years) {
      rows.push(['infocar.ua', `${label} — ${t('reviews.forYears', { years })}`, stats, match.yearUrl])
    }
    for (const link of infocarLinks(match)) {
      rows.push(['infocar.ua', `${label} — ${link.title ?? match.modelName ?? ''}`.trim(), stats, link.url])
    }
  }

  for (const review of data.press) {
    const [main] = orderedEditions(review, input.lang)
    const entry = main ? review.langs[main] : undefined
    if (entry) rows.push([review.source === 'itc' ? 'ITC.ua' : 'Mezha', entry.title, '—', entry.url])
  }
  for (const post of data.ownerPosts) rows.push(['e-drive.com.ua', post.title, '—', post.url])
  for (const review of data.topgear) {
    const rating = review.rating !== null ? `${review.rating}/${review.bestRating ?? 10}` : '—'
    rows.push(['TopGear', review.title, rating, review.url])
  }

  if (rows.length === 0) return null
  return {
    type: 'table',
    id: 'reviews',
    title: t('reviews.title'),
    columns: [t('export.source'), t('export.title'), t('export.rating'), t('export.url')],
    rows
  }
}

function buildWikiSection(input: ExportInput, t: Translate): ExportKeyValueSection | null {
  const wiki = input.wiki
  if (!wiki?.found) return null
  const rows: Row[] = []
  pushRow(rows, t('export.wikiTitle'), [wiki.title, wiki.description].filter(Boolean).join(' — '))
  // Intro only: the "Read more" body is long and overlaps the other sections.
  pushRow(rows, t('export.wikiSummary'), wiki.extract)
  pushRow(rows, t('export.wikiPage'), wiki.pageUrl)
  if (rows.length === 0) return null
  return { type: 'kv', id: 'wiki', title: t('wiki.title'), rows }
}

function buildPhotosSection(input: ExportInput, t: Translate): ExportLinksSection | null {
  if (input.photos.length === 0) return null
  return {
    type: 'links',
    id: 'photos',
    title: t('photos.title'),
    links: input.photos.map((p, i) => ({ label: t('export.photoN', { n: i + 1 }), url: p.webformatURL }))
  }
}

// --- Crash-test safety: coverage + per-source "what do these numbers mean" text, mirroring the
// ❓ popovers in SafetyRatings.tsx / *Ratings.tsx (see those files' RatingsInfo/CoverageInfo). ---

function buildSafetyCoverageSection(t: Translate): ExportTextSection {
  return {
    type: 'text',
    id: 'safetyCoverage',
    title: t('export.safetyCoverageTitle'),
    paragraphs: [
      t('safety.coverageInfoIntro'),
      `${t('safety.coverageInfoEuroNcapTitle')}: ${t('safety.coverageInfoEuroNcapBody')}`,
      `${t('safety.coverageInfoNhtsaTitle')}: ${t('safety.brandsInfoIntro')}`,
      `${t('safety.coverageInfoJncapTitle')}: ${t('safety.coverageInfoJncapBody')}`,
      `${t('safety.coverageInfoCncapTitle')}: ${t('safety.coverageInfoCncapBody')}`,
      `${t('safety.coverageInfoKncapTitle')}: ${t('safety.coverageInfoKncapBody')}`,
      `${t('safety.coverageInfoIihsTitle')}: ${t('safety.coverageInfoIihsBody')}`
    ]
  }
}

function joinNotes(t: Translate, keys: string[]): string {
  return keys.map(k => t(k)).join(' ')
}

function euroncapTable(data: EuroNcapRatingsResponse | null, t: Translate): ExportTableSection | null {
  if (!data || data.ratings.length === 0) return null
  const columns = [
    t('export.applicable'),
    t('export.variant'),
    t('field.year'),
    t('export.stars'),
    t('safety.euroncapAdultOccupant'),
    t('safety.euroncapChildOccupant'),
    t('safety.euroncapVulnerableRoadUsers'),
    t('safety.euroncapSafetyAssist'),
    t('safety.euroncapSafetyPack'),
    t('export.reportUrl'),
    t('export.pdfUrl'),
    t('export.videoUrls')
  ]
  const rows = data.ratings.map(r => [
    r.assessmentId === data.applicableAssessmentId ? t('export.yes') : '',
    r.testedVariant ?? '—',
    r.ratingYear != null ? String(r.ratingYear) : '—',
    r.stars != null ? String(r.stars) : '—',
    r.adultOccupantPct != null ? `${r.adultOccupantPct}%` : '—',
    r.childOccupantPct != null ? `${r.childOccupantPct}%` : '—',
    r.vulnerableRoadUsersPct != null ? `${r.vulnerableRoadUsersPct}%` : '—',
    r.safetyAssistPct != null ? `${r.safetyAssistPct}%` : '—',
    r.safetyPack ? t('export.yes') : '',
    r.url,
    r.reportPdfUrl ?? '—',
    r.youtubeIds.map(id => `https://youtu.be/${id}`).join('; ') || '—'
  ])
  const note = joinNotes(t, [
    'safety.euroncapRatingsInfoStars',
    'safety.euroncapRatingsInfoAdultOccupant',
    'safety.euroncapRatingsInfoChildOccupant',
    'safety.euroncapRatingsInfoVulnerableRoadUsers',
    'safety.euroncapRatingsInfoSafetyAssist',
    'safety.euroncapRatingsInfoSafetyPack',
    'safety.euroncapRatingsInfoExpiry'
  ])
  return { type: 'table', id: 'euroncap', title: t('safety.tabEuroNcap'), note, columns, rows }
}

function nhtsaTable(data: SafetyRatingsResponse | null, body: string | null, t: Translate): ExportTableSection | null {
  const ratings = filterByBodyStyle(data?.ratings ?? [], body, r => nhtsaBodyBucket(r.description))
  if (ratings.length === 0) return null
  const columns = [
    t('export.variant'),
    t('safety.overall'),
    t('safety.front'),
    t('safety.side'),
    t('safety.rollover'),
    t('safety.sidePole'),
    t('safety.rolloverRisk'),
    t('safety.esc'),
    t('safety.fcw'),
    t('safety.ldw'),
    t('export.complaints'),
    t('export.recalls'),
    t('export.videoUrls')
  ]
  const rows = ratings.map(r => [
    r.description,
    r.overallRating ?? '—',
    r.overallFrontCrashRating ?? '—',
    r.overallSideCrashRating ?? '—',
    r.rolloverRating ?? '—',
    r.sidePoleCrashRating ?? '—',
    formatPercent(r.rolloverPossibility) ?? '—',
    r.electronicStabilityControl ?? '—',
    r.forwardCollisionWarning ?? '—',
    r.laneDepartureWarning ?? '—',
    r.complaintsCount != null ? String(r.complaintsCount) : '—',
    r.recallsCount != null ? String(r.recallsCount) : '—',
    [r.frontCrashVideo, r.sideCrashVideo, r.sidePoleVideo]
      .filter((v): v is string => v != null)
      .map(v => safetyVideoUrl(v))
      .join('; ') || '—'
  ])
  const note = joinNotes(t, [
    'safety.ratingsInfoStars',
    'safety.ratingsInfoOverall',
    'safety.ratingsInfoFront',
    'safety.ratingsInfoSide',
    'safety.ratingsInfoRollover',
    'safety.ratingsInfoSidePole',
    'safety.ratingsInfoRolloverRisk',
    'safety.ratingsInfoEquipment',
    'safety.ratingsInfoCombinedSideBarrier',
    'safety.ratingsInfoComplaints',
    'safety.ratingsInfoInvestigations'
  ])
  return { type: 'table', id: 'nhtsa', title: t('safety.tabNhtsa'), note, columns, rows }
}

function jncapTable(data: JncapRatingsResponse | null, t: Translate): ExportTableSection | null {
  if (!data || data.ratings.length === 0) return null
  const columns = [
    t('export.applicable'),
    t('field.year'),
    t('export.stars'),
    t('export.overallPct'),
    t('safety.jncapPreventive'),
    t('safety.jncapCollision'),
    t('safety.jncapEmergencyCall'),
    t('export.reportUrl'),
    t('export.pdfUrl'),
    t('export.videoUrls')
  ]
  const rows = data.ratings.map(r => [
    r.assessmentId === data.applicableAssessmentId ? t('export.yes') : '',
    r.ratingYear != null ? String(r.ratingYear) : '—',
    r.stars != null ? String(r.stars) : '—',
    r.overallPct != null ? `${r.overallPct}%` : '—',
    [r.preventiveRank, r.preventivePct != null ? `${r.preventivePct}%` : null].filter(Boolean).join(' / ') || '—',
    [r.collisionRank, r.collisionPct != null ? `${r.collisionPct}%` : null].filter(Boolean).join(' / ') || '—',
    [r.emergencyCallType, r.emergencyCallPct != null ? `${r.emergencyCallPct}%` : null].filter(Boolean).join(' / ') ||
      '—',
    r.url,
    r.reportPdfUrl ?? '—',
    r.youtubeId ? `https://youtu.be/${r.youtubeId}` : '—'
  ])
  const note = joinNotes(t, [
    'safety.jncapRatingsInfoStars',
    'safety.jncapRatingsInfoPreventive',
    'safety.jncapRatingsInfoCollision',
    'safety.jncapRatingsInfoEmergencyCall'
  ])
  return { type: 'table', id: 'jncap', title: t('safety.tabJncap'), note, columns, rows }
}

function cncapTable(data: CncapRatingsResponse | null, t: Translate): ExportTableSection | null {
  if (!data || data.ratings.length === 0) return null
  const columns = [
    t('export.applicable'),
    t('field.year'),
    t('export.overallScore'),
    t('safety.cncapOccupant'),
    t('safety.cncapVru'),
    t('safety.cncapActiveSafety'),
    t('export.vehicleClass'),
    t('safety.cncapOriginalName')
  ]
  const fmt = (v: number | null, unit: CncapRatingsResponse['ratings'][number]['scoreUnit']): string =>
    v == null ? '—' : unit === 'pct' ? `${v}%` : `${v} ${t('safety.cncapPoints')}`
  const rows = data.ratings.map(r => [
    r.assessmentId === data.applicableAssessmentId ? t('export.yes') : '',
    r.ratingYear != null ? String(r.ratingYear) : '—',
    fmt(r.overallScore, r.scoreUnit),
    fmt(r.occupantScore, r.scoreUnit),
    fmt(r.vruScore, r.scoreUnit),
    fmt(r.activeSafetyScore, r.scoreUnit),
    r.vehicleClass ? t(`safety.cncapClass.${r.vehicleClass}`) : '—',
    r.nameZh
  ])
  const note = joinNotes(t, [
    'safety.cncapRatingsInfoUnit',
    'safety.cncapRatingsInfoOccupant',
    'safety.cncapRatingsInfoVru',
    'safety.cncapRatingsInfoActiveSafety'
  ])
  return { type: 'table', id: 'cncap', title: t('safety.tabCncap'), note, columns, rows }
}

function kncapTable(data: KncapRatingsResponse | null, t: Translate): ExportTableSection | null {
  if (!data || data.ratings.length === 0) return null
  const columns = [
    t('export.applicable'),
    t('field.year'),
    t('export.overallClass'),
    t('export.overallScore'),
    t('safety.kncapCrash'),
    t('safety.kncapPedestrian'),
    t('safety.kncapAccident'),
    t('export.reportUrl'),
    t('safety.kncapOriginalName')
  ]
  const cat = (star: number | null, pct: number | null): string =>
    [star != null ? `${star}★` : null, pct != null ? `${pct}%` : null].filter(Boolean).join(' / ') || '—'
  const rows = data.ratings.map(r => [
    r.assessmentId === data.applicableAssessmentId ? t('export.yes') : '',
    r.ratingYear != null ? String(r.ratingYear) : '—',
    r.overallClass != null ? t('safety.kncapClass', { n: r.overallClass }) : '—',
    r.overallScore != null ? `${r.overallScore}%` : '—',
    cat(r.crashStar, r.crashPct),
    cat(r.pedestrianStar, r.pedestrianPct),
    cat(r.accidentStar, r.accidentPct),
    `https://www.kncap.org/ncs/KncapResultDetail/initView.jsp?${new URLSearchParams({
      DETAIL_IDX: r.assessmentId,
      DETAIL_YEAR: String(r.ratingYear ?? '')
    }).toString()}`,
    r.nameKo
  ])
  const note = joinNotes(t, [
    'safety.kncapRatingsInfoClass',
    'safety.kncapRatingsInfoCrash',
    'safety.kncapRatingsInfoPedestrian',
    'safety.kncapRatingsInfoAccident'
  ])
  return { type: 'table', id: 'kncap', title: t('safety.tabKncap'), note, columns, rows }
}

function iihsDetailUrl(assessmentId: string): string {
  return `https://www.iihs.org/ratings/vehicle/${assessmentId.split('/').map(encodeURIComponent).join('/')}`
}

function iihsTable(data: IihsRatingsResponse | null, body: string | null, t: Translate): ExportTableSection | null {
  const ratings = filterByBodyStyle(data?.ratings ?? [], body, r => iihsBodyBucket(r.variantType))
  if (ratings.length === 0) return null
  const applicableIds = data?.applicableAssessmentIds ?? []
  const groups = groupIihsRatings(ratings, applicableIds)
  const columns = [
    t('export.applicable'),
    t('export.variant'),
    t('export.modelYears'),
    t('export.award'),
    t('export.tests'),
    t('export.reportUrl')
  ]
  const rows = groups.map(g => [
    g.applicable ? t('export.yes') : '',
    g.variantType,
    g.yearFrom === g.yearTo ? String(g.yearFrom) : `${g.yearFrom}–${g.yearTo}`,
    g.award ?? '—',
    g.tests
      .filter(test => test.rating != null)
      .map(test => `${test.label}: ${test.rating}${test.qualifier ? ` (${test.qualifier})` : ''}`)
      .join('; ') || '—',
    iihsDetailUrl(g.primaryAssessmentId)
  ])
  const note = joinNotes(t, ['safety.iihsRatingsInfoScale', 'safety.iihsRatingsInfoFcp', 'safety.iihsRatingsInfoAward'])
  return { type: 'table', id: 'iihs', title: t('safety.tabIihs'), note, columns, rows }
}

function collectMedia(
  input: ExportInput,
  t: Translate
): { images: ExportLinksSection | null; videos: ExportLinksSection | null } {
  const images = new Map<string, string>()
  const videos = new Map<string, string>()
  const addImage = (label: string, url: string | null | undefined): void => {
    if (url) images.set(url, label)
  }
  const addVideo = (label: string, url: string | null | undefined): void => {
    if (url) videos.set(url, label)
  }

  input.euroncap?.ratings.forEach(r => {
    const label = r.testedVariant ?? t('safety.tabEuroNcap')
    addImage(`${t('safety.tabEuroNcap')} — ${label}`, r.frontImageUrl)
    r.images.forEach(img => addImage(`${t('safety.tabEuroNcap')} — ${label} (${img.test ?? 'photo'})`, img.url))
    r.youtubeIds.forEach(id => addVideo(`${t('safety.tabEuroNcap')} — ${label}`, `https://youtu.be/${id}`))
  })
  input.nhtsa?.ratings.forEach(r => {
    addImage(`${t('safety.tabNhtsa')} — ${r.description} (${t('safety.front')})`, r.frontCrashPicture)
    addImage(`${t('safety.tabNhtsa')} — ${r.description} (${t('safety.side')})`, r.sideCrashPicture)
    addImage(`${t('safety.tabNhtsa')} — ${r.description} (${t('safety.sidePole')})`, r.sidePolePicture)
    ;[r.frontCrashVideo, r.sideCrashVideo, r.sidePoleVideo].forEach(
      v => v != null && addVideo(`${t('safety.tabNhtsa')} — ${r.description}`, safetyVideoUrl(v))
    )
  })
  input.jncap?.ratings.forEach(r => {
    addImage(t('safety.tabJncap'), r.imageUrl)
    if (r.youtubeId) addVideo(t('safety.tabJncap'), `https://youtu.be/${r.youtubeId}`)
  })
  input.kncap?.ratings.forEach(r => addImage(t('safety.tabKncap'), r.imageUrl))
  input.iihs?.ratings.forEach(r => addImage(t('safety.tabIihs'), r.imageUrl))
  input.reviews?.videos.forEach(v => addVideo(`${t('videos.title')} — ${v.title}`, v.url))
  if (input.wiki?.image) addImage(t('wiki.title'), input.wiki.image.url)
  input.photos.forEach((p, i) => addImage(t('export.photoN', { n: i + 1 }), p.webformatURL))

  const images_ = [...images.entries()].map(([url, label]) => ({ label, url }))
  const videos_ = [...videos.entries()].map(([url, label]) => ({ label, url }))

  return {
    images: images_.length > 0 ? { type: 'links', id: 'images', title: t('export.allImages'), links: images_ } : null,
    videos: videos_.length > 0 ? { type: 'links', id: 'videos', title: t('export.allVideos'), links: videos_ } : null
  }
}

export type ExportLocalRecord = { value: string; label: string | null; date: number }

/** History/Favorites bulk export — one flat table of everything currently saved locally
 *  (see LocalRecordsExportButton), not a per-vehicle deep dive like buildExportReport above. */
export function buildLocalRecordsReport(title: string, entries: ExportLocalRecord[], t: Translate): ExportReport {
  const columns = [t('export.value'), t('export.label'), t('export.date')]
  const rows = entries.map(e => [e.value, e.label ?? '—', new Date(e.date).toLocaleString()])
  return {
    title,
    subtitle: t('export.recordCount', { count: entries.length }),
    logo: null,
    heroImage: null,
    generatedAtLabel: t('export.generatedAt', { date: new Date().toLocaleString() }),
    sections: [{ type: 'table', id: 'records', title, columns, rows }]
  }
}

export function buildExportReport(input: ExportInput, t: Translate): ExportReport {
  const label = [input.vehicle.brand, input.vehicle.model].filter(Boolean).join(' ')
  const title =
    [label, input.vehicle.year ? `(${input.vehicle.year})` : null].filter(Boolean).join(' ') || t('export.untitled')
  const logoUrl = brandLogoUrl(input.vehicle.brand)
  const subtitle = [input.plate, input.vin].filter(Boolean).join(' · ')
  const hasAnyRatings = Boolean(
    input.euroncap || input.nhtsa || input.jncap || input.cncap || input.kncap || input.iihs
  )
  const media = collectMedia(input, t)

  const sections: (ExportSection | null)[] = [
    buildVehicleSection(input, t),
    buildRankingsSection(input, t),
    buildEmissionsSection(input, t),
    buildVinDecodeSection(input, t),
    buildHistorySection('historyPlate', t('result.historyTitle'), input.plateHistoryActions, t),
    buildHistorySection('historyVin', t('result.historyTitleVin'), input.vinHistoryActions, t),
    hasAnyRatings ? buildSafetyCoverageSection(t) : null,
    euroncapTable(input.euroncap, t),
    nhtsaTable(input.nhtsa, input.vehicle.body, t),
    jncapTable(input.jncap, t),
    cncapTable(input.cncap, t),
    kncapTable(input.kncap, t),
    iihsTable(input.iihs, input.vehicle.body, t),
    buildVdbSection(input, t),
    buildRdwSection(input, t),
    ...buildPriceSections(input, t),
    buildReviewsSection(input, t),
    buildWikiSection(input, t),
    buildPhotosSection(input, t),
    media.images,
    media.videos
  ]

  return {
    title,
    subtitle,
    logo: logoUrl ? { url: logoUrl, alt: input.vehicle.brand ?? title } : null,
    heroImage:
      input.wiki?.found && input.wiki.image ? { url: input.wiki.image.url, alt: input.wiki.title ?? title } : null,
    generatedAtLabel: t('export.generatedAt', { date: new Date().toLocaleString() }),
    sections: sections.filter((s): s is ExportSection => s != null)
  }
}
