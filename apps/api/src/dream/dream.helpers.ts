import { DREAM_EXCLUDED_STATUS, regionForKatottg } from '@carplates/shared'
import type { DreamSummaryResponse } from '@carplates/shared'

/** One stored project, reduced to what the summary needs. */
export type StoredProject = {
  status: string
  projectType: string | null
  oblastCode: string | null
  committedUah: number
  updatedAt: Date
}

type Bucket = {
  projects: number
  committedUah: number
  byStatus: Record<string, number>
  byType: Record<string, number>
}

const emptyBucket = (): Bucket => ({ projects: 0, committedUah: 0, byStatus: {}, byType: {} })

function add(bucket: Bucket, p: StoredProject): void {
  bucket.projects++
  bucket.committedUah += p.committedUah
  bucket.byStatus[p.status] = (bucket.byStatus[p.status] ?? 0) + 1
  const type = p.projectType ?? 'other'
  bucket.byType[type] = (bucket.byType[type] ?? 0) + 1
}

const roundUah = (n: number): number => Math.round(n * 100) / 100

/**
 * Per plate region and national totals. Cancelled entries are left out of everything. A project without a known oblast counts in the
 * total (and in `unlocated`) but in no region, so the regions never add up to more than the country.
 */
export function summarizeProjects(projects: readonly StoredProject[]): DreamSummaryResponse | null {
  const total = emptyBucket()
  const byRegion = new Map<string, Bucket>()
  let unlocated = 0
  let newest = 0
  for (const p of projects) {
    if (p.status === DREAM_EXCLUDED_STATUS) continue
    add(total, p)
    newest = Math.max(newest, p.updatedAt.getTime())
    const region = regionForKatottg(p.oblastCode)
    if (!region) {
      unlocated++
      continue
    }
    const bucket = byRegion.get(region) ?? emptyBucket()
    add(bucket, p)
    byRegion.set(region, bucket)
  }
  if (total.projects === 0) return null
  return {
    updatedAt: new Date(newest).toISOString(),
    total: { ...total, committedUah: roundUah(total.committedUah) },
    regions: [...byRegion.entries()]
      .map(([region, b]) => ({ region, ...b, committedUah: roundUah(b.committedUah) }))
      .sort((a, b) => b.projects - a.projects),
    unlocated
  }
}
