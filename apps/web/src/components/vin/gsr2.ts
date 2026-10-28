/**
 * EU General Safety Regulation 2 (Regulation (EU) 2019/2144), Annex II, passenger cars (M1). Dates checked against the
 * regulation text (Annex II notes B / Art. 16): new vehicle TYPES are refused type-approval without the system from
 * 2022-07-06, and every NEW car may not be registered without it from 2024-07-07.
 */
export const GSR2_SYSTEMS = [
  { key: 'aeb', typesFrom: '2022-07-06', allFrom: '2024-07-07' },
  { key: 'elks', typesFrom: '2022-07-06', allFrom: '2024-07-07' },
  { key: 'isa', typesFrom: '2022-07-06', allFrom: '2024-07-07' },
  { key: 'ddaw', typesFrom: '2022-07-06', allFrom: '2024-07-07' },
  { key: 'addw', typesFrom: '2024-07-07', allFrom: '2026-07-07' },
  { key: 'aebpc', typesFrom: '2024-07-07', allFrom: '2026-07-07' }
] as const

export type Gsr2Key = (typeof GSR2_SYSTEMS)[number]['key']

/**
 * none: the year ends before the rule starts · newTypes: only models type-approved after `typesFrom` need it ·
 * transition: the year contains `allFrom`, so it depends on the registration month · all: every new car needs it.
 */
export type Gsr2Status = 'none' | 'newTypes' | 'transition' | 'all'

/**
 * Legal status of one system for a car first registered in `year`. Only a year is known (the model year stands in for
 * the first-registration date), so the whole year is compared with the two dates. A legal baseline, not the car's kit.
 */
export function gsr2Status(year: number, rule: { typesFrom: string; allFrom: string }): Gsr2Status {
  const start = Date.UTC(year, 0, 1)
  const end = Date.UTC(year, 11, 31)
  if (end < Date.parse(rule.typesFrom)) return 'none'
  if (start >= Date.parse(rule.allFrom)) return 'all'
  if (end >= Date.parse(rule.allFrom)) return 'transition'
  return 'newTypes'
}

export type Gsr2Item = {
  key: Gsr2Key
  status: Exclude<Gsr2Status, 'none'>
  typesFrom: string
  allFrom: string
}

/** The systems with a non-'none' status for `year`; empty for cars from before the regulation. */
export function gsr2Baseline(year: number | null): Gsr2Item[] {
  if (year === null) return []
  return GSR2_SYSTEMS.flatMap(s => {
    const status = gsr2Status(year, s)
    return status === 'none' ? [] : [{ key: s.key, status, typesFrom: s.typesFrom, allFrom: s.allFrom }]
  })
}

/** The items split by rule dates (stages), oldest stage first, so each stage gets its own explanation. */
export function gsr2Stages(items: Gsr2Item[]): Gsr2Item[][] {
  const stages = new Map<string, Gsr2Item[]>()
  for (const item of items) stages.set(item.typesFrom, [...(stages.get(item.typesFrom) ?? []), item])
  return [...stages.values()]
}
