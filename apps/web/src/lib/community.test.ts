import { describe, it, expect } from 'vitest'

import { matchesAllWords } from './community'

describe('matchesAllWords', () => {
  it('rejects "audio" for "audi"', () => {
    expect(matchesAllWords('Best audio setup for my car', 'AUDI Q5')).toBe(false)
  })

  it('requires every word', () => {
    expect(matchesAllWords('Audi A4 oil change', 'AUDI Q5')).toBe(false)
    expect(matchesAllWords('2019 Audi Q5 reliability?', 'AUDI Q5')).toBe(true)
  })

  it('matches whole words next to punctuation', () => {
    expect(matchesAllWords('Audi, Q5: any issues', 'audi q5')).toBe(true)
  })
})
