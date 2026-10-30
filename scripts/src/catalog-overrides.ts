export type CatalogOverrides = {
  /** `makeKey|modelKey` of models that are real (never folded). */
  known: string[]
  /** `brand|model` (raw registry text) -> forced slugs. */
  alias: Map<string, { make: string; model: string }>
  /** `make/model` slug page -> the page it merges into. */
  fold: Map<string, { make: string; model: string }>
  /** `make/model` slugs that never get a page. */
  drop: Set<string>
  /** `make/model` slugs -> display model name. */
  names: Map<string, string>
}

/** Parses `catalog-overrides.csv`; the first non-comment line is the header and is skipped. */
export function parseCatalogOverrides(csv: string): CatalogOverrides {
  const out: CatalogOverrides = { known: [], alias: new Map(), fold: new Map(), drop: new Set(), names: new Map() }
  const lines = csv.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'))
  for (const line of lines.slice(1)) {
    const [kind, a = '', b = '', c = '', d = ''] = line.split(',').map(s => s.trim())
    if (kind === 'known' && a && b) out.known.push(`${a}|${b}`)
    else if (kind === 'alias' && a && b && c && d) out.alias.set(`${a}|${b}`, { make: c, model: d })
    else if (kind === 'fold' && a && b && c && d) out.fold.set(`${a}/${b}`, { make: c, model: d })
    else if (kind === 'drop' && a && b) out.drop.add(`${a}/${b}`)
    else if (kind === 'name' && a && b && c) out.names.set(`${a}/${b}`, c)
    else throw new Error(`catalog-overrides.csv: bad row "${line}"`)
  }
  return out
}
