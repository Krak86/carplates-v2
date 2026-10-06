import { describe, it, expect } from 'vitest'

import { SOCIAL_CHANNELS, socialChannelsFor } from './socialChannels.js'

describe('socialChannelsFor', () => {
  it('returns the make then its group', () => {
    expect(socialChannelsFor('KIA').map(c => c.id)).toEqual(['kia', 'group:hyundai-group'])
  })

  it('falls back to the group when the make has no channel of its own', () => {
    expect(socialChannelsFor('DACIA').map(c => c.id)).toEqual(['group:renault-group'])
  })

  it('returns only the make when it has no group', () => {
    expect(socialChannelsFor('TOYOTA').map(c => c.id)).toEqual(['toyota'])
  })

  it('is empty for unknown or missing brands', () => {
    expect(socialChannelsFor('ZAZ')).toEqual([])
    expect(socialChannelsFor(null)).toEqual([])
  })
})

describe('SOCIAL_CHANNELS', () => {
  it('has unique ids and well-formed channel ids', () => {
    expect(new Set(SOCIAL_CHANNELS.map(c => c.id)).size).toBe(SOCIAL_CHANNELS.length)
    for (const c of SOCIAL_CHANNELS) expect(c.youtubeId).toMatch(/^UC[\w-]{22}$/)
  })
})
