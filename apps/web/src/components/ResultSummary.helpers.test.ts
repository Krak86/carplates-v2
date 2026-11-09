import { describe, expect, it } from 'vitest'

import {
  auctionCard,
  co2Card,
  co2Figure,
  crashCard,
  operationCard,
  recallsCard,
  wantedCard
} from '@/components/ResultSummary.helpers'
import type { Co2Inputs, CrashInputs, RecallInputs } from '@/components/ResultSummary.types'

const fmt = (iso: string): string => iso.slice(0, 10)

/** Fixtures stay down to the fields the helpers read, so every query answer is typed `never` (fits any `Fetched<T>`). */
const done = (data: unknown): never => ({ data, isError: false, isLoading: false }) as never
const loading = { data: undefined, isError: false, isLoading: true } as never
const failed = { data: undefined, isError: true, isLoading: false } as never

describe('wantedCard', () => {
  const base = { wanted: false, records: [], checkedAt: '2026-11-01T10:00:00Z', trackedSince: null }

  it('is pending while loading', () => {
    expect(wantedCard(loading, fmt).state).toBe('pending')
  })
  it('is no data when the request failed or the list was never loaded', () => {
    expect(wantedCard(failed, fmt).state).toBe('nodata')
    expect(wantedCard(done({ ...base, checkedAt: null }), fmt).state).toBe('nodata')
  })
  it('flags a wanted vehicle and a wanted plate', () => {
    expect(wantedCard(done({ ...base, wanted: true }), fmt)).toMatchObject({
      state: 'attention',
      textKey: 'summary.wanted.wanted'
    })
    expect(wantedCard(done({ ...base, plateWanted: true }), fmt).textKey).toBe('summary.wanted.plate')
  })
  it('flags a removed record as history', () => {
    expect(wantedCard(done({ ...base, records: [{}] }), fmt).textKey).toBe('summary.wanted.was')
  })
  it('says nothing found with the check date', () => {
    expect(wantedCard(done(base), fmt)).toMatchObject({
      state: 'ok',
      textKey: 'summary.wanted.clear',
      params: { date: '2026-11-01' }
    })
  })
})

describe('operationCard', () => {
  it('has no data without an operation code', () => {
    expect(operationCard(null, null).state).toBe('nodata')
  })
  it('shows the status and the year', () => {
    expect(operationCard(105, '2024-05-02')).toMatchObject({
      state: 'ok',
      textKey: 'summary.operation.withYear',
      params: { year: '2024' },
      paramKeys: { status: 'oper.status.new' }
    })
  })
  it('flags leaving the register', () => {
    expect(operationCard(530, '2023-01-01').state).toBe('attention')
  })
})

describe('crashCard', () => {
  const none: CrashInputs = {
    euroncap: done({ ratings: [], applicableAssessmentId: null }),
    nhtsa: done({ ratings: [] }),
    jncap: done({ ratings: [], applicableAssessmentId: null }),
    cncap: done({ ratings: [], applicableAssessmentId: null }),
    kncap: done({ ratings: [], applicableAssessmentId: null }),
    iihs: done({ ratings: [], applicableAssessmentIds: [] }),
    body: null
  }
  const euro = (stars: number | null): never =>
    done({ ratings: [{ assessmentId: 'a', stars }], applicableAssessmentId: 'a' })

  it('is no data when no programme rated this car', () => {
    expect(crashCard(none).state).toBe('nodata')
  })
  it('stays pending while a programme loads and nothing was found yet', () => {
    expect(crashCard({ ...none, iihs: loading }).state).toBe('pending')
  })
  it('ignores a rating of another generation', () => {
    const other = done({ ratings: [{ assessmentId: 'b', stars: 5 }], applicableAssessmentId: null })
    expect(crashCard({ ...none, euroncap: other }).state).toBe('nodata')
  })
  it('shows Euro NCAP stars and the programme count', () => {
    expect(crashCard({ ...none, euroncap: euro(5) })).toMatchObject({
      state: 'ok',
      textKey: 'summary.crash.euroncap',
      params: { stars: 5, count: 1, total: 6 }
    })
  })
  it('flags low stars', () => {
    expect(crashCard({ ...none, euroncap: euro(2) }).state).toBe('attention')
  })
  it('falls back to a programme count without Euro NCAP stars', () => {
    const jncap = done({ ratings: [{ assessmentId: 'j' }], applicableAssessmentId: 'j' })
    expect(crashCard({ ...none, euroncap: euro(null), jncap })).toMatchObject({
      textKey: 'summary.crash.count',
      params: { count: 2, total: 6 }
    })
  })
})

describe('co2Card', () => {
  const noRdw = done({ match: null })
  const estimate = (min: number, max: number): never =>
    done({ estimate: { co2GKmMin: min, co2GKmMax: max, cycle: 'WLTP' } })

  it('uses the EPA / EEA range midpoint', () => {
    const input: Co2Inputs = { fuel: estimate(100, 120), rdw: null }
    expect(co2Figure(input)).toEqual({ gKm: 110, cycle: 'WLTP' })
    expect(co2Card(input)).toMatchObject({ state: 'ok', params: { gKm: 110, cycle: 'WLTP' } })
  })
  it('falls back to the Dutch register median', () => {
    const rdw = done({ match: { specs: { co2GKm: { min: 1, median: 150, max: 2 } } } })
    expect(co2Figure({ fuel: done({ estimate: null }), rdw })).toEqual({ gKm: 150, cycle: 'WLTP / NEDC' })
  })
  it('flags the highest band', () => {
    expect(co2Card({ fuel: estimate(260, 280), rdw: null }).state).toBe('attention')
  })
  it('is no data when neither source has a figure, pending while the fallback loads', () => {
    expect(co2Card({ fuel: done({ estimate: null }), rdw: noRdw }).state).toBe('nodata')
    expect(co2Card({ fuel: done({ estimate: null }), rdw: loading }).state).toBe('pending')
    expect(co2Card({ fuel: null, rdw: null }).state).toBe('nodata')
  })
})

describe('auctionCard', () => {
  it('flags lots, counted', () => {
    expect(auctionCard(done({ lots: [{}, {}], checkedAt: '2026-11-02T00:00:00Z' }), fmt)).toMatchObject({
      state: 'attention',
      params: { count: 2 }
    })
  })
  it('says nothing found with the ingest date, no data when it never ran', () => {
    expect(auctionCard(done({ lots: [], checkedAt: '2026-11-02T00:00:00Z' }), fmt)).toMatchObject({
      state: 'ok',
      params: { date: '2026-11-02' }
    })
    expect(auctionCard(done({ lots: [], checkedAt: null }), fmt).state).toBe('nodata')
    expect(auctionCard(failed, fmt).state).toBe('nodata')
  })
})

describe('recallsCard', () => {
  const rdw = (total: number): never => done({ match: total ? { total } : null })
  const none: RecallInputs = { rdw: rdw(0), nhtsa: done({ total: 0 }), ca: done({ match: null }) }

  it('sums the campaigns of every source', () => {
    expect(recallsCard({ ...none, rdw: rdw(3), nhtsa: done({ total: 2 }) })).toMatchObject({
      state: 'attention',
      params: { count: 5 }
    })
  })
  it('names only the sources that answered', () => {
    expect(recallsCard({ ...none, nhtsa: failed })).toMatchObject({
      state: 'ok',
      params: { sources: 'RDW, Transport Canada' }
    })
  })
  it('stays pending while a source loads, no data when all failed', () => {
    expect(recallsCard({ ...none, ca: loading }).state).toBe('pending')
    expect(recallsCard({ rdw: failed, nhtsa: failed, ca: failed }).state).toBe('nodata')
  })
})
