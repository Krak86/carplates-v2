import { describe, expect, it } from 'vitest'

import { isJobName, JOBS, pingEnvVar } from './jobs.js'

describe('jobs', () => {
  it('recognises only registered jobs', () => {
    expect(isJobName('news')).toBe(true)
    expect(isJobName('wanted-plates')).toBe(true)
    expect(isJobName('toString')).toBe(false)
    expect(isJobName('nope')).toBe(false)
  })

  it('has a positive timeout for every job', () => {
    for (const job of Object.values(JOBS)) expect(job.timeoutMin).toBeGreaterThan(0)
  })

  it('derives the healthchecks env var from the job name', () => {
    expect(pingEnvVar('plates')).toBe('HC_PING_PLATES')
    expect(pingEnvVar('wanted-plates')).toBe('HC_PING_WANTED_PLATES')
    expect(pingEnvVar('youtube-videos')).toBe('HC_PING_YOUTUBE_VIDEOS')
  })
})
