import type { WikiSource } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'

import type { Dims } from '@/components/size/fit'
import {
  completeSize,
  mergeSize,
  SIZE_FIELDS,
  sizeClass,
  sizeShape,
  vinWheelbaseMm,
  type ClassResult,
  type SizeField,
  type SizeFigures,
  type SizeShape
} from '@/components/size/VehicleSize.helpers'
import { rdwQuery, wikiSpecsQuery } from '@/lib/queries'

export type VehicleSizeInput = {
  brand: string | null
  model: string | null
  year: number | null
  /** Registry kind / body text of the car (null on the VIN page, which has none). */
  kind?: string | null
  body?: string | null
  /** NHTSA fields of the decoded VIN, when known; adds the wheelbase and a body-class hint. */
  vinFields?: ReadonlyMap<string, string> | null
}

export type VehicleSize = {
  /** Every field is either a real figure or tagged `estimate`; buses and trucks may keep gaps. */
  figures: SizeFigures
  estimated: readonly SizeField[]
  /** No published figure: the shape's typical vehicle is shown. */
  typicalOnly: boolean
  shape: SizeShape
  /** False when the shape is the generic `car` fallback. */
  shapeKnown: boolean
  /** Null for motorcycles, buses, trucks and typical-only forecasts. */
  cls: ClassResult | null
  /** The three outer sizes, when all are there. */
  dims: Dims | null
  /** What the figures were read from, for the lead line. */
  sources: {
    rdw: { name: string; n: number; year: number } | null
    wiki: WikiSource | null
    vin: boolean
  }
}

/**
 * The size of a car merged from every source we hold: the RDW fleet median, the Wikipedia generation, the VIN decode and
 * the registry body, with the gaps forecast and tagged. Reads the same queries as Specs / Generation specs (both are
 * warmed by the card bundle), so it costs no request of its own; null while loading or when nothing honest can be shown.
 */
export function useVehicleSize({ brand, model, year, kind, body, vinFields }: VehicleSizeInput): VehicleSize | null {
  const enabled = !!(brand && model && year)
  const { data: rdwData } = useQuery({ ...rdwQuery(brand ?? '', model ?? '', year ?? 0, kind), enabled })
  const { data: wikiData } = useQuery({ ...wikiSpecsQuery(brand ?? '', model ?? '', year ?? 0), enabled })
  const rdw = rdwData?.match ?? null
  const wiki = wikiData?.match ?? null

  const shape = sizeShape({
    kind,
    body,
    rdwBodyTypes: rdw?.specs.bodyTypes ?? null,
    vinBodyClass: vinFields?.get('Body Class') ?? null
  })
  const merged = mergeSize({
    rdw: rdw?.specs ?? null,
    wiki: wiki?.dimensions ?? null,
    vinWheelbaseMm: vinWheelbaseMm(vinFields)
  })
  const completed = completeSize(merged, shape)
  if (!shape || !completed) return null

  const { figures, estimated, typicalOnly } = completed
  const { lengthMm, widthMm, heightMm } = figures
  const length = lengthMm?.value ?? null
  const used = (source: string): boolean => SIZE_FIELDS.some(f => figures[f]?.source === source)

  return {
    figures,
    estimated,
    typicalOnly,
    shape: shape.shape,
    shapeKnown: shape.known,
    cls: length != null && !typicalOnly ? sizeClass(length, shape.shape) : null,
    dims:
      lengthMm && widthMm && heightMm
        ? { lengthMm: lengthMm.value, widthMm: widthMm.value, heightMm: heightMm.value }
        : null,
    sources: {
      rdw:
        rdw && used('rdw') ? { name: `${rdw.makeName} ${rdw.modelName}`, n: rdw.specs.n, year: rdw.specs.year } : null,
      wiki: wiki?.dimensionsSource && used('wiki') ? wiki.dimensionsSource : null,
      vin: used('vin')
    }
  }
}
