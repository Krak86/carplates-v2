import type { OriginResponse, WantedRecord, WantedResponse } from '@carplates/shared'

import { buildOriginView, ukraineFromActions, yearRange } from '@/components/OriginSection.helpers'
import { countryLabel } from '@/components/vin/helpers'
import type { ExportInput, ExportKeyValueSection, Translate } from '@/lib/export-report'

/** Live "is it on the police list" answer and the brand/plant origin - the two card sections added after the first export. */
export type ExportVerifyInput = {
  origin?: OriginResponse | null
  wanted?: WantedResponse | null
}

type Row = { label: string; value: string }

const DASH = '-'

function localeOf(lang: string): string {
  return lang === 'ua' ? 'uk' : lang
}

function dateOf(iso: string | null | undefined, lang: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(localeOf(lang))
}

function ownerYears(from: number | null, to: number | null, t: Translate): string {
  if (from && to) return t('origin.owner.range', { from, to })
  if (from) return t('origin.owner.since', { from })
  return to ? t('origin.owner.until', { to }) : ''
}

function push(rows: Row[], label: string, value: string | null | undefined): void {
  if (value) rows.push({ label, value })
}

/** Mirrors OriginSection: the same steps, hints and countries (former states by year), as label/value rows. */
export function buildOriginSection(input: ExportInput, t: Translate): ExportKeyValueSection | null {
  const actions = input.plateHistoryActions ?? input.vinHistoryActions ?? []
  const view = buildOriginView(input.origin ?? undefined, input.vehicle.year, ukraineFromActions(actions))
  if (view.steps.length === 0) return null

  const country = (code: string): string => countryLabel(code, input.lang, t)
  const rows: Row[] = []

  for (const step of view.steps) {
    const label = t(`origin.step.${step.kind}`)

    if (step.kind === 'brand') {
      const ssr = step.ukrainianSsr ? ` (${t('origin.country.ukrainianSsr')})` : ''
      const details = [
        step.foundedYear ? t('origin.brand.founded', { year: step.foundedYear }) : null,
        step.hqCity ? t('origin.brand.hq', { city: step.hqCity }) : null
      ].filter(Boolean)
      push(rows, label, [`${country(step.country)}${ssr}`, ...details].join(' · '))
    } else if (step.kind === 'ownership') {
      push(
        rows,
        label,
        step.owners
          .map(o =>
            [o.name, ownerYears(o.from, o.to, t) && `(${ownerYears(o.from, o.to, t)})`].filter(Boolean).join(' ')
          )
          .join('; ')
      )
    } else if (step.kind === 'assembly') {
      push(
        rows,
        label,
        [country(step.country), step.city, `(${t(`origin.assembly.${step.via}`)})`].filter(Boolean).join(' ')
      )
      push(
        rows,
        t('origin.assembly.also'),
        step.alsoBuiltIn
          .map(alt => [country(alt.country), alt.city, yearRange(alt.from, alt.to)].filter(Boolean).join(' '))
          .join('; ')
      )
    } else {
      push(
        rows,
        label,
        [
          t(step.imported ? 'origin.ukraine.imported' : 'origin.ukraine.registered'),
          step.date ? t('origin.ukraine.date', { date: step.date }) : null
        ]
          .filter(Boolean)
          .join(' · ')
      )
    }
  }

  if (view.makerMismatch) {
    push(rows, DASH, t('origin.warn.mismatch', { maker: view.makerMismatch, brand: input.vehicle.brand ?? '' }))
  }
  if (view.northAmericaVin) push(rows, DASH, t('origin.hint.northAmerica'))
  push(rows, t('export.source'), t('export.originSource'))

  return { type: 'kv', id: 'origin', title: t('origin.title'), rows }
}

function recordValue(record: WantedRecord, t: Translate, lang: string): string {
  const removed =
    record.status === 'removed'
      ? record.removedExact === false
        ? t('wanted.removedUnknown')
        : `${t('wanted.removedAt')}: ${dateOf(record.removedAt, lang) ?? DASH}`
      : null
  return [
    t(`wanted.status.${record.status}`),
    t(`wanted.by.${record.matchedBy}`),
    record.seizedAt ? `${t('wanted.seizedAt')}: ${dateOf(record.seizedAt, lang) ?? DASH}` : null,
    removed,
    record.source === 'stolen.in.ua' ? 'stolen.in.ua' : null
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Mirrors WantedCheck: the verdict, every matching record and when the police list was last refreshed. */
export function buildWantedSection(input: ExportInput, t: Translate): ExportKeyValueSection | null {
  const data = input.wanted
  if (!data) return null

  const verdict = data.wanted ? 'wanted' : data.records.length > 0 ? 'was' : 'clear'
  const rows: Row[] = []
  push(rows, t('export.wantedStatus'), t(`wanted.chip.${verdict}`))

  for (const record of data.records) {
    const vehicle = [record.brand, record.model].filter(Boolean).join(' ') || t('wanted.vehicle')
    push(rows, vehicle, recordValue(record, t, input.lang))
  }

  push(rows, t('export.wantedChecked'), dateOf(data.checkedAt, input.lang))
  push(rows, t('export.source'), t('export.wantedSource'))

  return { type: 'kv', id: 'wanted', title: t('wanted.title'), rows }
}
