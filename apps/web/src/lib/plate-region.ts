import { plateSeries, regionName } from '@carplates/shared'

import { localizeRegion } from '@/lib/region-label'

type Translate = (key: string) => string

/** The plate's series note ("Diia series (no region)"), or null for a regional plate. */
export function plateSeriesLabel(plate: string | null | undefined, t: Translate): string | null {
  const series = plate ? plateSeries(plate) : undefined
  return series ? t(`result.series.${series}`) : null
}

/** Region for a plate (in `lang`); falls back to its series note, then "region not determined". */
export function plateRegionLabel(plate: string | null | undefined, t: Translate, lang: string): string {
  const region = plate ? regionName(plate) : undefined
  return (region && localizeRegion(region, lang)) || plateSeriesLabel(plate, t) || t('result.regionUnknown')
}

/** `result.noRegion.<key>` explaining why a regionless plate has no region: its series, else the generic reasons. */
export function noRegionInfoKey(plate: string): string {
  return plateSeries(plate) ?? 'generic'
}
