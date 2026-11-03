import { describe, expect, it } from 'vitest'

import { resolveStatsTab } from './helpers'

const tab = (query: string) => resolveStatsTab(new URLSearchParams(query))

describe('resolveStatsTab', () => {
  it('defaults to overview', () => {
    expect(tab('')).toBe('overview')
    expect(tab('highlightModel=VOLKSWAGEN::PASSAT')).toBe('overview')
  })

  it('maps old deep links to the tab that holds them', () => {
    expect(tab('dim=brand&highlight=BMW')).toBe('registry')
    expect(tab('view=map')).toBe('registry')
    expect(tab('weight=truck')).toBe('rankings')
  })

  it('lets an explicit valid tab win, ignoring an invalid one', () => {
    expect(tab('tab=origin&dim=brand')).toBe('origin')
    expect(tab('tab=nope&dim=brand')).toBe('registry')
  })
})
