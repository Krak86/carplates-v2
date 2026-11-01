import type { JobStatus } from '@carplates/shared'

import { CADENCE_DAYS, CADENCES } from '@/routes/data-status/types'
import type { Cadence, Dataset, Status } from '@/routes/data-status/types'

const DAY_MS = 86_400_000
/** A sync up to this many periods old is fresh (a daily job finishes ~04:xx, so it is still fresh ~30 h later); up to twice that it is due. */
const FRESH_PERIODS = 1.25
const DUE_PERIODS = 2

/** The newest sync: the latest of the job's last `ok` run and the manual refresh date; `null` when neither exists. */
export function lastSync(dataset: Dataset, jobs: readonly JobStatus[]): Date | null {
  const dates: Date[] = []
  const run = dataset.job ? jobs.find(j => j.job === dataset.job) : undefined
  if (run?.lastOkAt) dates.push(new Date(run.lastOkAt))
  if (dataset.refreshedOn) dates.push(new Date(`${dataset.refreshedOn}T00:00:00Z`))
  if (dates.length === 0) return null
  return new Date(Math.max(...dates.map(d => d.getTime())))
}

/** `failing` wins over the age: the newest run of the dataset's job ended `failed` or `timeout`. */
export function datasetStatus(dataset: Dataset, jobs: readonly JobStatus[], now: Date = new Date()): Status {
  if (dataset.cadence === 'live') return 'live'
  if (dataset.cadence === 'frozen') return 'frozen'
  const run = dataset.job ? jobs.find(j => j.job === dataset.job) : undefined
  if (run && (run.lastStatus === 'failed' || run.lastStatus === 'timeout')) return 'failing'
  const synced = lastSync(dataset, jobs)
  if (!synced) return 'unknown'
  const period = dataset.checkEveryDays ?? CADENCE_DAYS[dataset.cadence]
  const ageDays = (now.getTime() - synced.getTime()) / DAY_MS
  if (ageDays <= period * FRESH_PERIODS) return 'fresh'
  if (ageDays <= period * DUE_PERIODS) return 'due'
  return 'stale'
}

/** The registry publishes a month some weeks after it ends, so its newest record normally trails today by up to ~2.5 months. */
const REGISTRY_FRESH_DAYS = 75
const REGISTRY_DUE_DAYS = 120

/** Freshness of the registry data itself, by how far its last registration date trails `now`; `unknown` for no date. */
export function registryStatus(lastDate: string | null, now: Date = new Date()): Status {
  if (!lastDate) return 'unknown'
  const ageDays = (now.getTime() - new Date(`${lastDate}T00:00:00Z`).getTime()) / DAY_MS
  if (ageDays <= REGISTRY_FRESH_DAYS) return 'fresh'
  if (ageDays <= REGISTRY_DUE_DAYS) return 'due'
  return 'stale'
}

/** The datasets of each cadence in `CADENCES` order, empty cadences left out. */
export function groupByCadence(datasets: readonly Dataset[]): { cadence: Cadence; datasets: Dataset[] }[] {
  return CADENCES.map(cadence => ({ cadence, datasets: datasets.filter(d => d.cadence === cadence) })).filter(
    g => g.datasets.length > 0
  )
}

/** How many datasets sit in each status, for the summary chips. */
export function countByStatus(statuses: readonly Status[]): Partial<Record<Status, number>> {
  const counts: Partial<Record<Status, number>> = {}
  for (const status of statuses) counts[status] = (counts[status] ?? 0) + 1
  return counts
}
