import { describe, expect, it } from 'vitest'
import type { JobStatus } from '@carplates/shared'

import { DATASETS } from './datasets'
import { countByStatus, datasetStatus, groupByCadence, lastSync, registryStatus } from './helpers'
import type { Dataset } from './types'

const now = new Date('2026-11-01T12:00:00Z')
const job = (over: Partial<JobStatus>): JobStatus => ({
  job: 'news',
  lastStatus: 'ok',
  lastStartedAt: '2026-11-01T03:10:00Z',
  lastOkAt: '2026-11-01T03:12:00Z',
  ...over
})
const daily: Dataset = { id: 'news', name: 'News', cadence: 'daily', job: 'news' }
const manual: Dataset = { id: 'x', name: 'X', cadence: 'halfYearly', refreshedOn: '2026-10-13' }

describe('lastSync', () => {
  it('takes the job run when it is newer than the manual date, and the manual date for a job that never ran', () => {
    const both: Dataset = { ...daily, refreshedOn: '2026-10-31' }
    expect(lastSync(both, [job({})])?.toISOString()).toBe('2026-11-01T03:12:00.000Z')
    expect(lastSync(both, [])?.toISOString()).toBe('2026-10-31T00:00:00.000Z')
  })

  it('is null without a run or a date', () => {
    expect(lastSync(daily, [])).toBeNull()
    expect(lastSync(daily, [job({ lastOkAt: null })])).toBeNull()
  })
})

describe('datasetStatus', () => {
  it('is fresh while the sync is within 1.25 periods, due up to 2, then stale', () => {
    expect(datasetStatus(daily, [job({})], now)).toBe('fresh')
    expect(datasetStatus(daily, [job({ lastOkAt: '2026-10-31T03:00:00Z' })], now)).toBe('due')
    expect(datasetStatus(daily, [job({ lastOkAt: '2026-10-28T03:00:00Z' })], now)).toBe('stale')
  })

  it('judges a manual dataset by its refresh date against its cadence', () => {
    expect(datasetStatus(manual, [], now)).toBe('fresh')
    expect(datasetStatus(manual, [], new Date('2027-07-01T00:00:00Z'))).toBe('due')
    expect(datasetStatus(manual, [], new Date('2028-01-01T00:00:00Z'))).toBe('stale')
  })

  it('uses checkEveryDays instead of the cadence when set', () => {
    const plates: Dataset = { id: 'p', name: 'P', cadence: 'monthly', job: 'plates', checkEveryDays: 7 }
    expect(datasetStatus(plates, [job({ job: 'plates', lastOkAt: '2026-10-28T03:00:00Z' })], now)).toBe('fresh')
    expect(datasetStatus(plates, [job({ job: 'plates', lastOkAt: '2026-10-20T03:00:00Z' })], now)).toBe('due')
    expect(datasetStatus(plates, [job({ job: 'plates', lastOkAt: '2026-10-10T03:00:00Z' })], now)).toBe('stale')
  })

  it('flags a failed or timed-out newest run as failing, even when an older run was ok', () => {
    expect(datasetStatus(daily, [job({ lastStatus: 'failed' })], now)).toBe('failing')
    expect(datasetStatus(daily, [job({ lastStatus: 'timeout' })], now)).toBe('failing')
    expect(datasetStatus(daily, [job({ lastStatus: 'running' })], now)).toBe('fresh')
  })

  it('is unknown with nothing to go on, and frozen / live never age', () => {
    expect(datasetStatus(daily, [], now)).toBe('unknown')
    expect(datasetStatus({ id: 'f', name: 'F', cadence: 'frozen', refreshedOn: '2020-01-01' }, [], now)).toBe('frozen')
    expect(datasetStatus({ id: 'l', name: 'L', cadence: 'live' }, [], now)).toBe('live')
  })
})

describe('registryStatus', () => {
  it('allows for the publishing lag: fresh to 75 days behind, due to 120, then stale', () => {
    expect(registryStatus('2026-08-30', now)).toBe('fresh')
    expect(registryStatus('2026-07-15', now)).toBe('due')
    expect(registryStatus('2026-05-01', now)).toBe('stale')
    expect(registryStatus(null, now)).toBe('unknown')
  })
})

describe('catalog', () => {
  it('has unique ids', () => {
    expect(new Set(DATASETS.map(d => d.id)).size).toBe(DATASETS.length)
  })

  it('gives every non-live dataset a known date, so none is ever "unknown"', () => {
    const missing = DATASETS.filter(d => d.cadence !== 'live' && !d.refreshedOn).map(d => d.id)
    expect(missing).toEqual([])
  })

  it('groups by cadence in display order and counts statuses', () => {
    expect(groupByCadence(DATASETS)[0]?.cadence).toBe('daily')
    expect(countByStatus(['fresh', 'fresh', 'stale'])).toEqual({ fresh: 2, stale: 1 })
  })
})
