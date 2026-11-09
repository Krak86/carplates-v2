/** Column order. */
export const SERVICES = [
  'ours',
  'avtonomera',
  'bazagai',
  'opendatabot',
  'autoria',
  'rst',
  'carvertical',
  'carfax'
] as const
export type Service = (typeof SERVICES)[number]

/** yes = offered free · paid = offered behind a paid report · partial = basic/link-out only · none = not on their site · unknown = could not check. */
export const CELLS = ['yes', 'paid', 'partial', 'none', 'unknown'] as const
export type Cell = (typeof CELLS)[number]

export type FeatureRow = {
  key: string
  /** One cell per SERVICES entry, same order. */
  cells: readonly [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell]
}
