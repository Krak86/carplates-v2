import type { MotCounts } from '@carplates/db'

/** A stored MOT make/model key; DVSA's 2024+ files put the trim in the model ("EV6 GT-LINE"), so one model is many keys. */
export type MotFamilyKey = { kind: string; makeKey: string; modelKey: string; model: string; tests: number }

/**
 * All trim keys of the model the registry means, for a PREFIX match only (no key is exactly that model, so nothing
 * can be folded wrongly — "range rover" never swallows "range rover sport" because that one matches exactly).
 * Same make and kind, key starts with the registry key; a key ending in a digit may not continue with another digit
 * ("ix3" must not take "ix35"). Otherwise just the matched key.
 */
export function motFamilyOf<T extends MotFamilyKey>(models: readonly T[], row: T, direct: string): T[] {
  if (!row.modelKey.startsWith(direct)) return [row]
  const digitEnd = /\d$/.test(direct)
  const family = models.filter(
    m =>
      m.kind === row.kind &&
      m.makeKey === row.makeKey &&
      m.modelKey.startsWith(direct) &&
      !(digitEnd && /^\d/.test(m.modelKey.slice(direct.length)))
  )
  return family.length > 0 ? family : [row]
}

/** The `...ev` key of a model (ingest counts its electric trims there), same make and kind; null when none is stored. */
export function evKeyOf<T extends MotFamilyKey>(models: readonly T[], row: T): T | null {
  return (
    models.find(m => m.kind === row.kind && m.makeKey === row.makeKey && m.modelKey === row.modelKey + 'ev') ?? null
  )
}

/** Leading whole words shared by every name ("EV6 GT-LINE", "EV6 AIR" -> "EV6"); the first name when nothing is shared. */
export function commonModelName(names: readonly string[]): string {
  const split = names.map(n => n.split(/\s+/))
  const first = split[0] ?? []
  let n = 0
  while (n < first.length && split.every(w => w[n] === first[n])) n++
  return n > 0 ? first.slice(0, n).join(' ') : (names[0] ?? '')
}

type IssueLike = { band: number; tests: number; dangerous: number; groups: MotCounts; reasons: MotCounts }

const addCounts = (into: MotCounts, from: MotCounts): void => {
  for (const [code, [a, b]] of Object.entries(from)) {
    const cur = into[code]
    into[code] = cur ? [cur[0] + a, cur[1] + b] : [a, b]
  }
}

/** Sums per-band issue rows of several keys (the top-10 reasons per key are summed, so a rare reason is under-counted). */
export function mergeIssueRows<T extends IssueLike>(rows: readonly T[]): T[] {
  const byBand = new Map<number, T>()
  for (const r of rows) {
    const cur = byBand.get(r.band)
    if (!cur) {
      byBand.set(r.band, { ...r, groups: { ...r.groups }, reasons: { ...r.reasons } })
      continue
    }
    cur.tests += r.tests
    cur.dangerous += r.dangerous
    addCounts(cur.groups, r.groups)
    addCounts(cur.reasons, r.reasons)
  }
  return [...byBand.values()]
}
