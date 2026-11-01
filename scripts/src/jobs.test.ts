import { describe, expect, it } from 'vitest'

import { isJobName, JOBS, pingEnvVar } from './jobs.js'

describe('jobs', () => {
  it('recognises only registered jobs', () => {
    expect(isJobName('news')).toBe(true)
    expect(isJobName('wanted-plates')).toBe(true)
    expect(isJobName('auctions')).toBe(true)
    expect(isJobName('prozorro-auctions')).toBe(true)
    expect(isJobName('dtp-patrol')).toBe(true)
    expect(isJobName('dtp-hazards')).toBe(true)
    expect(isJobName('rdw-recalls')).toBe(true)
    expect(isJobName('ca-recalls')).toBe(true)
    expect(isJobName('toString')).toBe(false)
    expect(isJobName('nope')).toBe(false)
  })

  it('has a positive timeout for every job', () => {
    for (const job of Object.values(JOBS)) expect(job.timeoutMin).toBeGreaterThan(0)
  })

  it('derives the healthchecks env var from the job name', () => {
    expect(pingEnvVar('plates')).toBe('HC_PING_PLATES')
    expect(pingEnvVar('wanted-plates')).toBe('HC_PING_WANTED_PLATES')
    expect(pingEnvVar('auctions')).toBe('HC_PING_AUCTIONS')
    expect(pingEnvVar('prozorro-auctions')).toBe('HC_PING_PROZORRO_AUCTIONS')
    expect(pingEnvVar('dtp-patrol')).toBe('HC_PING_DTP_PATROL')
    expect(pingEnvVar('rdw-recalls')).toBe('HC_PING_RDW_RECALLS')
    expect(pingEnvVar('youtube-videos')).toBe('HC_PING_YOUTUBE_VIDEOS')
  })
})
