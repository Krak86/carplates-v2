import { computeVehicleSize } from '@/components/size/use-vehicle-size'
import { fitInBay, GARAGE_REFS, linkById, PARKING_REFS } from '@/components/size/fit'
import { formatMm, leadParts, mmToMetres, SIZE_FIELDS, sourceLabel } from '@/components/size/VehicleSize.helpers'
import { toFieldMap } from '@/components/vin/helpers'
import { wikiSourceUrl } from '@carplates/shared'
import {
  DIMENSION_KEYS,
  DIMENSION_LABELS,
  formatDimension,
  formatEngine,
  engineRows,
  sortEnginesByFit
} from '@/components/WikiSpecs.helpers'
import { driveRows } from '@/components/WikiDrive.helpers'
import type { ExportInput, ExportKeyValueSection, Translate } from '@/lib/export-report'

type Row = { label: string; value: string }

/** Mirrors the "Generation specs" section: engines (best fit for this car first), drive, and the gap dimensions. */
export function buildGenerationSection(input: ExportInput, t: Translate): ExportKeyValueSection | null {
  const match = input.wikiSpecs?.match
  if (!match) return null
  const locale = input.lang === 'ua' ? 'uk' : input.lang
  const name = `${match.makeName} ${match.modelName}`
  const generation = match.generationCode || match.generationLabel || ''
  const own = input.current
    ? {
        fuel: input.current.fuel,
        displacementCc: input.current.capacity,
        powerKw: input.current.powerKwt,
        massKg: input.current.ownWeight
      }
    : undefined
  const rows: Row[] = [{ label: t('export.catalogModel'), value: [name, generation].filter(Boolean).join(' · ') }]

  for (const e of sortEnginesByFit(match.engines ?? [], own)) {
    const details = engineRows(e, t)
      .map(r => `${t(`wikispec.row.${r.key}`)}: ${r.value}`)
      .join('; ')
    rows.push({ label: `${t('wikispec.engines')}: ${formatEngine(e, t)}`, value: details })
  }
  for (const r of driveRows(match.layout, match.transmission, t)) rows.push({ label: t(r.labelKey), value: r.value })
  if (match.dimensions) {
    for (const key of DIMENSION_KEYS) {
      const value = formatDimension(key, match.dimensions, t, locale)
      if (value) rows.push({ label: t(DIMENSION_LABELS[key]), value })
    }
  }
  const source = match.enginesSource ?? match.dimensionsSource ?? match.driveSource
  if (source) rows.push({ label: t('export.source'), value: wikiSourceUrl(source) })
  if (rows.length <= 1) return null
  return { type: 'kv', id: 'generation', title: t('wikispec.title'), rows }
}

/** Mirrors "Size & parking": figures with their sources, shape and class, and how the car fits each parking place and garage. */
export function buildSizeSection(input: ExportInput, t: Translate): ExportKeyValueSection | null {
  const { brand, model, year } = input.vehicle
  if (!brand || !model || !year) return null
  const size = computeVehicleSize({
    rdw: input.rdw?.match ?? null,
    wiki: input.wikiSpecs?.match ?? null,
    kind: input.current?.kind,
    body: input.vehicle.body,
    vinFields: input.vinDecodeResults ? toFieldMap(input.vinDecodeResults) : null
  })
  if (!size) return null

  const locale = input.lang === 'ua' ? 'uk' : input.lang
  const unit = t('wikispec.unitMm')
  const rows: Row[] = []
  for (const field of SIZE_FIELDS) {
    const figure = size.figures[field]
    if (!figure) continue
    const approx = figure.source === 'estimate' ? '≈ ' : ''
    rows.push({
      label: t(`size.field.${field}`),
      value: `${approx}${formatMm(figure.value, locale)} ${unit} (${mmToMetres(figure.value)} ${t('rdw.unitM')}) · ${sourceLabel(figure.source, size.sources.wiki, t)}`
    })
  }
  rows.push({ label: t('size.shape.label'), value: t(`size.shape.${size.shape}`) })
  if (size.cls) {
    const sub = size.cls.sub != null ? ` (${t(`rdw.size.${size.cls.sub}`)})` : ''
    rows.push({ label: t('size.class.label'), value: `${t(`size.class.${size.cls.cls}`)}${sub}` })
  }
  if (size.dims) {
    for (const ref of PARKING_REFS) {
      const fit = fitInBay(size.dims, ref.widthMm, ref.lengthMm)
      const link = linkById(ref.link)
      rows.push({
        label: t(`size.bay.${ref.id}`),
        value: [
          `${mmToMetres(ref.lengthMm)} × ${mmToMetres(ref.widthMm)} ${t('rdw.unitM')}`,
          t(`size.verdict.${fit.verdict}`),
          t('size.bay.margin', { side: Math.round(fit.sideMm / 10), length: Math.round(fit.lengthMm / 10) }),
          link?.url
        ]
          .filter(Boolean)
          .join(' · ')
      })
    }
    for (const g of GARAGE_REFS) {
      rows.push({
        label: t(`size.garage.${g.id}`),
        value: `${mmToMetres(g.lengthMm)} × ${mmToMetres(g.widthMm)} ${t('rdw.unitM')}, ${t('size.garage.doorLabel')} ${mmToMetres(g.doorWidthMm)} × ${mmToMetres(g.doorHeightMm)} ${t('rdw.unitM')}`
      })
    }
  }
  rows.push({ label: t('export.source'), value: leadParts(size.figures, size.sources.wiki, t).join(' · ') })
  return { type: 'kv', id: 'size', title: t('size.title'), rows }
}
