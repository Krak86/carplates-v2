import { SHARE_ROWS, visibleShares } from '@/components/RdwSpecs.helpers'
import type { ShareItem } from '@/components/RdwSpecs.helpers'

import type { CompareLoaded } from './types'

/** The categorical measures of the Dutch fleet drawn as stacked bars; the energy label is a grade, not a mix. */
export const SHARE_KEYS = ['fuelMix', 'bodyTypes', 'colours'] as const
export type ShareKey = (typeof SHARE_KEYS)[number]

/** Classes shown per bar before the rest is folded into "other". */
const SHARE_LIMIT = 4

export type ShareBar = {
  key: ShareKey
  itemPrefix: 'fuel' | 'body' | 'colour'
  /** One entry per car: the visible classes largest first, `null` when RDW has no figure for that car. */
  sides: readonly [ShareSide | null, ShareSide | null]
}

export type ShareSide = {
  items: ShareItem[]
  /** What is left after the shown classes (0..1), 0 when it is under the noise floor. */
  other: number
}

const side = (x: CompareLoaded, key: ShareKey): ShareSide | null => {
  const def = SHARE_ROWS.find(d => d.key === key)
  const specs = x.rdw?.specs
  if (!def || !specs) return null
  const items = visibleShares(def.pick(specs), SHARE_LIMIT)
  if (items.length === 0) return null
  const rest = 1 - items.reduce((sum, i) => sum + i.share, 0)
  return { items, other: rest >= 0.02 ? rest : 0 }
}

/** Fuel mix, body types and colours of each car's model in the Dutch fleet; a measure neither car has is dropped. */
export function buildShareBars(a: CompareLoaded, b: CompareLoaded): ShareBar[] {
  const out: ShareBar[] = []
  for (const key of SHARE_KEYS) {
    const def = SHARE_ROWS.find(d => d.key === key)
    const sides = [side(a, key), side(b, key)] as const
    if (def?.itemPrefix && (sides[0] || sides[1])) out.push({ key, itemPrefix: def.itemPrefix, sides })
  }
  return out
}
