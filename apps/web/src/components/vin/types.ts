export const VIN_GROUPS = ['identity', 'body', 'engine', 'safety', 'manufacturing', 'other'] as const
export type VinGroup = (typeof VIN_GROUPS)[number]

export type FieldRow = { variable: string; value: string }
export type GroupedFields = { group: VinGroup; rows: FieldRow[] }

export type VinSegmentId = 'wmi' | 'vds' | 'check' | 'year' | 'plant' | 'serial'
export type VinSegment = { id: VinSegmentId; start: number; text: string }

export type DriveType = 'fwd' | 'rwd' | 'awd'
export type EngineLayout = 'inline' | 'v' | 'flat' | 'other'

/** Which seat rows an airbag type covers, and which front seats it protects. */
export type AirbagCoverage = { rows: number[]; driver: boolean; passenger: boolean }

export type SchematicModel = {
  doors: number | null
  rows: number
  /** True when the row count is a guess (no "Number of Seat Rows" in the decode). */
  rowsInferred: boolean
  drive: DriveType | null
  tpms: 'direct' | 'indirect' | null
  airbags: {
    front: AirbagCoverage | null
    side: AirbagCoverage | null
    curtain: AirbagCoverage | null
    knee: AirbagCoverage | null
  }
}
