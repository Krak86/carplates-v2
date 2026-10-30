import { describe, expect, it } from 'vitest'

import { INDEXNOW_KEY } from './indexnow.js'

describe('INDEXNOW_KEY', () => {
  it('is a valid IndexNow key (8-128 hex chars) that deploy-api.yml can grep', () => {
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{8,128}$/)
  })
})
