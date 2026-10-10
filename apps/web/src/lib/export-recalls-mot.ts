import type {
  CaRecallsResponse,
  MotResponse,
  NhtsaComplaintsResponse,
  NhtsaRecallsResponse,
  RdwRecallsResponse
} from '@carplates/shared'

import { caRecallUrl, systemKey } from '@/components/CaRecalls.helpers'
import { bandLabel, formatShare, formatTests, groupKey, peakOf, yearsLabel } from '@/components/MotFaults.helpers'
import { reasonLabel } from '@/components/MotReasons'
import { componentKey } from '@/components/NhtsaRecalls.helpers'
import { categoryKey, formatRecallDate, formatVehicleCount, hazardKey } from '@/components/RdwRecalls.helpers'
import type { ExportKeyValueSection, ExportSection, ExportTableSection, Translate } from '@/lib/export-report'

/** Reasons printed in the Common faults export (the full list has ~2,000 codes); ranked by their peak fail rate. */
const MOT_REASONS_LIMIT = 30

const DASH = '—'

function localeOf(lang: string): string {
  return lang === 'ua' ? 'uk' : lang
}

function dateOf(iso: string | null, locale: string): string {
  return formatRecallDate(iso, locale) ?? DASH
}

function rdwTable(data: RdwRecallsResponse | null, t: Translate, lang: string): ExportTableSection | null {
  const recalls = data?.match?.recalls ?? []
  if (recalls.length === 0) return null
  const locale = localeOf(lang)
  const columns = [
    t('export.date'),
    t('export.component'),
    t('recalls.defect'),
    t('recalls.consequences'),
    t('recalls.remedy'),
    t('recalls.vehicles'),
    t('export.url')
  ]
  const rows = recalls.map(r => {
    const tr = r.translations?.[locale]
    const category = r.category ? t(categoryKey(r.category) ?? '', { defaultValue: r.category }) : DASH
    const hazards = r.hazards.map(h => t(hazardKey(h) ?? '', { defaultValue: h })).join(', ')
    const total = formatVehicleCount(r.vehiclesTotal, locale)
    const local = formatVehicleCount(r.vehiclesNational, locale)
    return [
      dateOf(r.publishedAt, locale),
      [category, hazards].filter(Boolean).join(' · '),
      tr?.defect ?? r.defect ?? DASH,
      tr?.consequences ?? r.consequences ?? DASH,
      tr?.remedy ?? r.remedy ?? DASH,
      total && local ? t('recalls.vehiclesBoth', { total, local }) : (total ?? local ?? DASH),
      r.moreInfoUrl ?? DASH
    ]
  })
  const m = data!.match!
  return {
    type: 'table',
    id: 'recallsRdw',
    title: t('export.sectionRdwRecalls'),
    note: [
      t('recalls.footnote', { count: m.total, name: `${m.makeName} ${m.modelName}` }),
      t('recalls.info.model'),
      t('recalls.info.credit')
    ].join(' '),
    columns,
    rows
  }
}

function nhtsaTable(data: NhtsaRecallsResponse | null, t: Translate, lang: string): ExportTableSection | null {
  if (!data || data.recalls.length === 0) return null
  const locale = localeOf(lang)
  const columns = [
    t('export.date'),
    t('export.component'),
    t('recalls.defect'),
    t('recalls.consequences'),
    t('recalls.remedy'),
    t('nhtsa.advisory'),
    t('export.url')
  ]
  const rows = data.recalls.map(r => {
    const key = r.component ? componentKey(r.component) : null
    const advisory = [
      r.parkIt && t('nhtsa.parkIt'),
      r.parkOutside && t('nhtsa.parkOutside'),
      r.overTheAirUpdate && t('nhtsa.ota')
    ]
      .filter(Boolean)
      .join('; ')
    return [
      dateOf(r.publishedAt, locale),
      key ? t(key) : (r.component ?? DASH),
      r.summary ?? DASH,
      r.consequence ?? DASH,
      r.remedy ?? DASH,
      advisory || DASH,
      `https://www.nhtsa.gov/recalls?nhtsaId=${encodeURIComponent(r.code)}`
    ]
  })
  const name = `${data.make} ${data.matchedModel ?? data.model} ${data.year}`
  return {
    type: 'table',
    id: 'recallsNhtsa',
    title: t('export.sectionNhtsaRecalls'),
    note: [t('nhtsa.footnote', { count: data.total, name }), t('nhtsa.info.credit')].join(' '),
    columns,
    rows
  }
}

function complaintsSection(
  data: NhtsaComplaintsResponse | null,
  t: Translate,
  lang: string
): ExportKeyValueSection | null {
  if (!data || data.total === 0) return null
  const locale = localeOf(lang)
  const rows: ExportKeyValueSection['rows'] = [
    { label: t('export.complaints'), value: String(data.total) },
    { label: t('nhtsa.complaints.crashes', { count: data.crashes }), value: String(data.crashes) },
    { label: t('nhtsa.complaints.fires', { count: data.fires }), value: String(data.fires) },
    { label: t('nhtsa.complaints.injuries', { count: data.injuries }), value: String(data.injuries) },
    { label: t('nhtsa.complaints.deaths', { count: data.deaths }), value: String(data.deaths) }
  ]
  if (data.components.length > 0) {
    rows.push({
      label: t('nhtsa.complaints.components'),
      value: data.components
        .map(c => {
          const key = componentKey(c.name)
          return `${key ? t(key) : c.name} (${c.count})`
        })
        .join(', ')
    })
  }
  if (data.latestFiled) {
    rows.push({ label: t('export.date'), value: dateOf(data.latestFiled, locale) })
  }
  rows.push({ label: t('export.source'), value: t('nhtsa.info.credit') })
  return { type: 'kv', id: 'complaints', title: t('nhtsa.complaints.title'), rows }
}

function caTable(data: CaRecallsResponse | null, t: Translate, lang: string): ExportTableSection | null {
  const match = data?.match
  if (!match || match.recalls.length === 0) return null
  const locale = localeOf(lang)
  const columns = [
    t('export.date'),
    t('export.component'),
    t('ca.years'),
    t('ca.units'),
    t('export.description'),
    t('export.url')
  ]
  const rows = match.recalls.map(r => {
    const key = r.system ? systemKey(r.system) : null
    return [
      dateOf(r.publishedAt, locale),
      key ? t(key) : (r.system ?? DASH),
      r.years.length > 0 ? yearsLabel(Math.min(...r.years), Math.max(...r.years)) : DASH,
      formatVehicleCount(r.units, locale) ?? DASH,
      r.text ?? DASH,
      caRecallUrl(r.code)
    ]
  })
  return {
    type: 'table',
    id: 'recallsCa',
    title: t('export.sectionCaRecalls'),
    note: [
      t('ca.footnote', { count: match.total, name: `${match.makeName} ${match.modelName}` }),
      t('ca.info.credit')
    ].join(' '),
    columns,
    rows
  }
}

/** Mirrors the Recalls block: EU (RDW), US (NHTSA) with the owner-complaint summary, and Canada. */
export function buildRecallSections(
  input: {
    rdwRecalls: RdwRecallsResponse | null
    nhtsaRecalls: NhtsaRecallsResponse | null
    nhtsaComplaints: NhtsaComplaintsResponse | null
    caRecalls: CaRecallsResponse | null
    lang: string
  },
  t: Translate
): ExportSection[] {
  const sections: (ExportSection | null)[] = [
    rdwTable(input.rdwRecalls, t, input.lang),
    nhtsaTable(input.nhtsaRecalls, t, input.lang),
    complaintsSection(input.nhtsaComplaints, t, input.lang),
    caTable(input.caRecalls, t, input.lang)
  ]
  return sections.filter((s): s is ExportSection => s != null)
}

/** Mirrors "Common faults": the summary, the fail rate per mileage band, and the most frequent faults by group/reason. */
export function buildMotSections(mot: MotResponse | null, t: Translate, lang: string): ExportSection[] {
  const match = mot?.match
  if (!match) return []
  const name = `${match.makeName} ${match.modelName}`
  const years = yearsLabel(match.window.from, match.window.to)
  const bands = match.bands.map((_, i) => bandLabel(match.edgesKm, i))
  const unit = t('mot.axis.km')

  const summary: ExportKeyValueSection = {
    type: 'kv',
    id: 'mot',
    title: t('mot.title'),
    rows: [
      { label: t('export.catalogModel'), value: name },
      ...(match.crossMake ? [{ label: t('export.vdbAliases'), value: t('mot.aka', { name }) }] : []),
      { label: t('mot.table.tests'), value: t('mot.sample', { tests: formatTests(match.tests), name, years }) },
      { label: t('export.source'), value: t('mot.info.credit') }
    ]
  }

  const bandRows = match.bands.map((b, i) => [
    `${bands[i]} ${unit}`,
    formatTests(b.tests),
    formatShare(b.failRate),
    formatShare(b.watchRate),
    formatShare(b.dangerousRate),
    formatShare(b.baselineFailRate)
  ])
  const bandsTable: ExportTableSection = {
    type: 'table',
    id: 'motBands',
    title: t('export.sectionMotBands'),
    note: t('mot.what.body'),
    columns: [
      t('export.motMileage'),
      t('mot.table.tests'),
      t('mot.fail'),
      t('mot.watch'),
      t('mot.dangerous'),
      t('mot.average')
    ],
    rows: bandRows
  }

  const perBand = (fail: readonly (number | null)[], watch: readonly (number | null)[]): string[] =>
    bands.map((_, i) => `${formatShare(fail[i])} / ${formatShare(watch[i])}`)
  const bandColumns = bands.map(b => `${b} (${t('mot.fail')} / ${t('mot.watch')})`)

  const groupsTable: ExportTableSection = {
    type: 'table',
    id: 'motGroups',
    title: t('export.sectionMotGroups'),
    columns: [t('export.component'), ...bandColumns],
    rows: match.groups.map(g => [t(groupKey(g.code)), ...perBand(g.fail, g.watch)])
  }

  const topReasons = [...match.reasons]
    .sort((a, b) => (peakOf(b.fail)?.value ?? 0) - (peakOf(a.fail)?.value ?? 0))
    .slice(0, MOT_REASONS_LIMIT)
  const reasonsTable: ExportTableSection = {
    type: 'table',
    id: 'motReasons',
    title: t('export.sectionMotReasons'),
    columns: [t('export.component'), t('export.reason'), ...bandColumns],
    rows: topReasons.map(r => [
      t(groupKey(r.group)),
      reasonLabel(r.code, lang) ?? r.failText,
      ...perBand(r.fail, r.watch)
    ])
  }

  return [
    summary,
    bandsTable,
    ...(groupsTable.rows.length > 0 ? [groupsTable] : []),
    ...(reasonsTable.rows.length > 0 ? [reasonsTable] : []),
    {
      type: 'text',
      id: 'motFooter',
      title: t('mot.what.title'),
      paragraphs: [t('mot.what.uk'), t('mot.info.model')]
    }
  ]
}
