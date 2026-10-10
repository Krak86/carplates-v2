import { z } from 'zod'
import {
  NHTSA_COMPLAINT_COMPONENTS,
  NHTSA_RECALLS_LIMIT,
  type NhtsaComplaintsResponse,
  type NhtsaRecall
} from '@carplates/shared'

const text = z.string().nullish()

/** One row of `recallsByVehicle`; NHTSA keeps unknown extras, so only what we read is declared. */
const upstreamRecallSchema = z.object({
  NHTSACampaignNumber: z.string(),
  Manufacturer: text,
  ReportReceivedDate: text,
  Component: text,
  Summary: text,
  Consequence: text,
  Remedy: text,
  parkIt: z.boolean().nullish(),
  parkOutSide: z.boolean().nullish(),
  overTheAirUpdate: z.boolean().nullish(),
  Model: text
})

export const upstreamRecallsSchema = z.object({ results: z.array(upstreamRecallSchema).default([]) })

const upstreamComplaintSchema = z.object({
  crash: z.boolean().nullish(),
  fire: z.boolean().nullish(),
  numberOfInjuries: z.number().nullish(),
  numberOfDeaths: z.number().nullish(),
  dateComplaintFiled: text,
  components: text,
  products: z.array(z.object({ productModel: text })).nullish()
})

export const upstreamComplaintsSchema = z.object({ results: z.array(upstreamComplaintSchema).default([]) })

type UpstreamRecall = z.infer<typeof upstreamRecallSchema>
type UpstreamComplaint = z.infer<typeof upstreamComplaintSchema>

/** NHTSA writes recall dates `dd/mm/yyyy` and complaint dates `mm/dd/yyyy`; returns ISO `yyyy-mm-dd`, null when unparseable. */
export function parseNhtsaDate(raw: string | null | undefined, order: 'dmy' | 'mdy'): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw?.trim() ?? '')
  if (!match) return null
  const [, a, b, year] = match
  const day = Number(order === 'dmy' ? a : b)
  const month = Number(order === 'dmy' ? b : a)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.replace(/\s+/g, ' ').trim()
  return trimmed ? trimmed : null
}

function mapRecall(raw: UpstreamRecall): NhtsaRecall {
  return {
    code: raw.NHTSACampaignNumber,
    publishedAt: parseNhtsaDate(raw.ReportReceivedDate, 'dmy'),
    producer: clean(raw.Manufacturer),
    component: clean(raw.Component),
    summary: clean(raw.Summary),
    consequence: clean(raw.Consequence),
    remedy: clean(raw.Remedy),
    parkIt: raw.parkIt ?? false,
    parkOutside: raw.parkOutSide ?? false,
    overTheAirUpdate: raw.overTheAirUpdate ?? false
  }
}

/** Newest first, the same campaign listed once (NHTSA repeats a campaign per affected model spelling); capped for the response. */
export function mapRecalls(rows: UpstreamRecall[]): { total: number; recalls: NhtsaRecall[] } {
  const byCode = new Map<string, NhtsaRecall>()
  for (const row of rows) if (!byCode.has(row.NHTSACampaignNumber)) byCode.set(row.NHTSACampaignNumber, mapRecall(row))
  const all = [...byCode.values()].sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
  return { total: all.length, recalls: all.slice(0, NHTSA_RECALLS_LIMIT) }
}

/** Counts only: crashes, fires, injuries, deaths and the most-named components. The narratives are dropped on purpose. */
export function summarizeComplaints(
  rows: UpstreamComplaint[]
): Omit<NhtsaComplaintsResponse, 'make' | 'model' | 'year' | 'matchedModel'> {
  const components = new Map<string, number>()
  let crashes = 0
  let fires = 0
  let injuries = 0
  let deaths = 0
  let latestFiled: string | null = null

  for (const row of rows) {
    if (row.crash) crashes += 1
    if (row.fire) fires += 1
    injuries += row.numberOfInjuries ?? 0
    deaths += row.numberOfDeaths ?? 0
    const filed = parseNhtsaDate(row.dateComplaintFiled, 'mdy')
    if (filed && (!latestFiled || filed > latestFiled)) latestFiled = filed
    for (const name of new Set(
      (row.components ?? '')
        .split(',')
        .map(part => part.trim())
        .filter(Boolean)
    )) {
      components.set(name, (components.get(name) ?? 0) + 1)
    }
  }

  return {
    total: rows.length,
    crashes,
    fires,
    injuries,
    deaths,
    components: [...components.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, NHTSA_COMPLAINT_COMPONENTS)
      .map(([name, count]) => ({ name, count })),
    latestFiled
  }
}
