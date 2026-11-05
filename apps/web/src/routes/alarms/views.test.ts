import { describe, expect, it } from 'vitest'

import { ALARM_VIEWS, DEFAULT_ALARM_VIEW, parseAlarmView } from '@/routes/alarms/views'

describe('parseAlarmView', () => {
  it('accepts every known view', () => {
    for (const view of ALARM_VIEWS) expect(parseAlarmView(view)).toBe(view)
  })

  it('falls back to the classic view', () => {
    expect(parseAlarmView(null)).toBe(DEFAULT_ALARM_VIEW)
    expect(parseAlarmView(undefined)).toBe(DEFAULT_ALARM_VIEW)
    expect(parseAlarmView('nope')).toBe(DEFAULT_ALARM_VIEW)
  })
})
