import { describe, expect, it } from 'vitest'

import { buildPgOptions } from './client.js'

describe('buildPgOptions', () => {
  it('returns undefined when no server-side limit is set (ingest, scripts)', () => {
    expect(buildPgOptions({})).toBeUndefined()
    expect(buildPgOptions({ max: 5 })).toBeUndefined()
  })

  it('builds the libpq options string for the API limits', () => {
    expect(buildPgOptions({ statementTimeoutMs: 15000, idleInTransactionTimeoutMs: 30000, lockTimeoutMs: 5000 })).toBe(
      '-c statement_timeout=15000 -c idle_in_transaction_session_timeout=30000 -c lock_timeout=5000'
    )
  })

  it('keeps an explicit 0 (disabled), distinct from unset', () => {
    expect(buildPgOptions({ statementTimeoutMs: 0 })).toBe('-c statement_timeout=0')
  })
})
