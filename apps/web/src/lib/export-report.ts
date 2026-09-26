import { regionName } from '@carplates/shared'
import type {
  CncapRatingsResponse,
  EuroNcapRatingsResponse,
  IihsRatingsResponse,
  JncapRatingsResponse,
  KncapRatingsResponse,
  Registration,
  SafetyRatingsResponse,
  VehiclePhoto,
  WikiInfo
} from '@carplates/shared'

import { safetyVideoUrl } from '@/lib/api'
import {
  filterByBodyStyle,
  formatPercent,
  groupIihsRatings,
  iihsBodyBucket,
  nhtsaBodyBucket
} from '@/components/SafetyRatings.helpers'

/** Loosely-typed `t` so this module doesn't have to fight i18next's generic overloads. */
export type Translate = (key: string, options?: Record<string, unknown>) => string

export const EXPORT_FORMATS = ['clipboard', 'txt', 'md', 'csv', 'docx', 'pdf'] as const
export type ExportFormat = (typeof EXPORT_FORMATS)[number]

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

export type ExportSection = ExportKeyValueSection | ExportTableSection | ExportLinksSection | ExportTextSection

export type ExportReport = {
  title: string
  subtitle: string
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
  photos: VehiclePhoto[]
  euroncap: EuroNcapRatingsResponse | null
  nhtsa: SafetyRatingsResponse | null
  jncap: JncapRatingsResponse | null
  cncap: CncapRatingsResponse | null
  kncap: KncapRatingsResponse | null
  iihs: IihsRatingsResponse | null
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
    pushRow(rows, t('field.owner'), c.person === 'P' ? t('field.ownerPrivate') : c.person ? t('field.ownerCompany') : null)
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

function buildVinDecodeSection(input: ExportInput, t: Translate): ExportKeyValueSection | null {
  if (!input.vinDecodeResults || input.vinDecodeResults.length === 0) return null
  return {
    type: 'kv',
    id: 'vinDecode',
    title: t('vin.title'),
    rows: input.vinDecodeResults.map(r => ({ label: r.variable, value: r.value }))
  }
}

function historyRow(action: Registration, t: Translate): string[] {
  const region = (action.plate && regionName(action.plate)) || t('result.regionUnknown')
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

function buildWikiSection(input: ExportInput, t: Translate): ExportKeyValueSection | null {
  const wiki = input.wiki
  if (!wiki?.found) return null
  const rows: Row[] = []
  pushRow(rows, t('export.wikiTitle'), wiki.title)
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
    [r.emergencyCallType, r.emergencyCallPct != null ? `${r.emergencyCallPct}%` : null].filter(Boolean).join(' / ') || '—',
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

function collectMedia(input: ExportInput, t: Translate): { images: ExportLinksSection | null; videos: ExportLinksSection | null } {
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
    generatedAtLabel: t('export.generatedAt', { date: new Date().toLocaleString() }),
    sections: [{ type: 'table', id: 'records', title, columns, rows }]
  }
}

export function buildExportReport(input: ExportInput, t: Translate): ExportReport {
  const label = [input.vehicle.brand, input.vehicle.model].filter(Boolean).join(' ')
  const title = [label, input.vehicle.year ? `(${input.vehicle.year})` : null].filter(Boolean).join(' ') || t('export.untitled')
  const subtitle = [input.plate, input.vin].filter(Boolean).join(' · ')
  const hasAnyRatings = Boolean(input.euroncap || input.nhtsa || input.jncap || input.cncap || input.kncap || input.iihs)
  const media = collectMedia(input, t)

  const sections: (ExportSection | null)[] = [
    buildVehicleSection(input, t),
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
    buildWikiSection(input, t),
    buildPhotosSection(input, t),
    media.images,
    media.videos
  ]

  return {
    title,
    subtitle,
    generatedAtLabel: t('export.generatedAt', { date: new Date().toLocaleString() }),
    sections: sections.filter((s): s is ExportSection => s != null)
  }
}
