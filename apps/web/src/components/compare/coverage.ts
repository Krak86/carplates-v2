import { COMPARE_SOURCES } from './types'
import type { CompareLoaded, CompareSource } from './types'

/** Which sources matched this car: the coverage strip under its name. A source that matched with no figure still counts. */
export function coverageOf(x: CompareLoaded): Record<CompareSource, boolean> {
  const matched: Record<CompareSource, boolean> = {
    registry: !!x.car?.exact || !!x.catalog,
    rdw: !!x.rdw,
    wiki: !!x.wiki,
    safety: !!x.euroNcap || x.nhtsaStars !== null,
    mot: x.motFailRate !== null,
    recalls: x.rdwRecalls !== null || x.nhtsaRecalls !== null || x.nhtsaComplaints !== null
  }
  return Object.fromEntries(COMPARE_SOURCES.map(s => [s, matched[s]])) as Record<CompareSource, boolean>
}
