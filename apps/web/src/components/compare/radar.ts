import { scalePosition, SPEC_ROWS } from '@/components/RdwSpecs.helpers'
import type { SpecScale } from '@/components/RdwSpecs.helpers'

import type { CompareRow } from './types'

/** A radar needs at least this many axes both cars have; fewer fall back to bars. */
export const MIN_RADAR_AXES = 3

export const RADAR_IDS = ['performance', 'practicality', 'economy', 'safety'] as const
export type RadarId = (typeof RADAR_IDS)[number]

type AxisDef = {
  /** The compare row (its id) the axis reads; the label is that row's label. */
  rowId: string
  scale: Pick<SpecScale, 'min' | 'max'>
  /** Less is better (mass, price, CO2): the axis is flipped so that further out is always better. */
  invert?: boolean
}

/** The outer-size scales are the ones the Specs block already draws, so "long" means the same thing in both places. */
const specScale = (key: string): Pick<SpecScale, 'min' | 'max'> => {
  const scale = SPEC_ROWS.find(def => def.key === key)?.scale
  if (!scale) throw new Error(`no scale for ${key}`)
  return { min: scale.min, max: scale.max }
}

/**
 * Fixed absolute scales (rule-of-thumb ranges of passenger cars), never "relative to the other car": two weak cars
 * must not look strong just because they are compared with each other.
 */
export const RADARS: Readonly<Record<RadarId, readonly AxisDef[]>> = {
  performance: [
    { rowId: 'power', scale: { min: 40, max: 300 } },
    { rowId: 'topSpeed', scale: { min: 140, max: 300 } },
    { rowId: 'powerToWeight', scale: { min: 20, max: 200 } },
    { rowId: 'displacement', scale: { min: 600, max: 5000 } }
  ],
  practicality: [
    { rowId: 'length', scale: specScale('length') },
    { rowId: 'wheelbase', scale: specScale('wheelbase') },
    { rowId: 'seats', scale: { min: 2, max: 9 } },
    { rowId: 'towBraked', scale: { min: 0, max: 3500 } },
    { rowId: 'kerbMass', scale: { min: 800, max: 2800 }, invert: true }
  ],
  economy: [
    { rowId: 'consumption', scale: { min: 3, max: 14 }, invert: true },
    { rowId: 'evRange', scale: { min: 100, max: 700 } },
    { rowId: 'co2', scale: { min: 0, max: 300 }, invert: true },
    { rowId: 'valueEstimate', scale: { min: 2000, max: 60000 }, invert: true },
    { rowId: 'ukrTotal', scale: { min: 3000, max: 70000 }, invert: true }
  ],
  safety: [
    { rowId: 'ncapAdult', scale: { min: 0, max: 100 } },
    { rowId: 'ncapChild', scale: { min: 0, max: 100 } },
    { rowId: 'ncapVru', scale: { min: 0, max: 100 } },
    { rowId: 'ncapAssist', scale: { min: 0, max: 100 } },
    { rowId: 'nhtsaStars', scale: { min: 0, max: 5 } }
  ]
}

export type RadarAxis = {
  row: CompareRow
  /** 0..1, further out is better. */
  a: number
  b: number
  rawA: number
  rawB: number
}

export type Radar = {
  id: RadarId
  axes: RadarAxis[]
  /** `radar` with enough common axes, `bars` with one or two, `none` with nothing in common. */
  mode: 'radar' | 'bars' | 'none'
}

const position = (axis: AxisDef, value: number): number => {
  const p = scalePosition({ ...axis.scale, cuts: [], labels: 'size' }, value)
  return axis.invert ? 1 - p : p
}

/** One radar: an axis is drawn only where **both** cars have a number. */
export function buildRadar(id: RadarId, rows: readonly CompareRow[]): Radar {
  const axes: RadarAxis[] = []
  for (const axis of RADARS[id]) {
    const row = rows.find(r => r.id === axis.rowId)
    const [a, b] = row?.values ?? [null, null]
    if (!row || typeof a !== 'number' || typeof b !== 'number') continue
    axes.push({ row, a: position(axis, a), b: position(axis, b), rawA: a, rawB: b })
  }
  return { id, axes, mode: axes.length >= MIN_RADAR_AXES ? 'radar' : axes.length > 0 ? 'bars' : 'none' }
}

export const buildRadars = (rows: readonly CompareRow[]): Radar[] =>
  RADAR_IDS.map(id => buildRadar(id, rows)).filter(r => r.mode !== 'none')

/** Radars compare like with like: a car and a motorcycle share no scale. Unknown kinds (a model ref) do not block. */
export const sameKind = (a: string | null | undefined, b: string | null | undefined): boolean =>
  !a || !b || a.trim().toLowerCase() === b.trim().toLowerCase()
