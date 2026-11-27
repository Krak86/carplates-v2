import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { maskEmail, maskIpv4, maskIpv6, maskPlate, maskVin, redactLogText, redactLogValue } from './log-redact.js'

const fixture = readFileSync(new URL('./__fixtures__/log-lines.txt', import.meta.url), 'utf8')
  .split(/\r?\n/)
  .filter(line => line.trim() && !line.startsWith('#'))
  .map(line => line.split('\t') as [string, string])

describe('redactLogText fixture', () => {
  it('has well-formed rows', () => {
    expect(fixture.length).toBeGreaterThan(20)
    for (const row of fixture) expect(row).toHaveLength(2)
  })

  it.each(fixture)('masks %j', (raw, expected) => {
    expect(redactLogText(raw)).toBe(expected)
  })

  it.each(fixture)('is idempotent for %j', (_raw, expected) => {
    expect(redactLogText(expected)).toBe(expected)
  })

  it('never leaks a raw plate, VIN, e-mail or IP from the fixture', () => {
    const leaks = ['AA1234BB', 'WVWZZZ1JZXW000001', 'roman@gmail.com', '203.0.113.42', 'abc.def.ghi', '8a2e:370:7334']
    for (const [raw] of fixture) {
      const out = redactLogText(raw)
      for (const leak of leaks) expect(out).not.toContain(leak)
    }
  })
})

describe('mask helpers', () => {
  it('masks plates', () => {
    expect(maskPlate('AA1234BB')).toBe('AA****BB')
    expect(maskPlate('AA 1234 BB')).toBe('AA****BB')
    expect(maskPlate('ABC')).toBe('***')
  })

  it('masks VINs', () => {
    expect(maskVin('WVWZZZ1JZXW000001')).toBe('WVW**********0001')
  })

  it('masks e-mails', () => {
    expect(maskEmail('roman', 'gmail.com')).toBe('r***@g***.com')
  })

  it('masks IPs and rejects non-addresses', () => {
    expect(maskIpv4('10.1.2.3')).toBe('10.1.2.0')
    expect(maskIpv4('300.1.2.3')).toBeNull()
    expect(maskIpv6('2001:db8:1:2:3:4:5:6')).toBe('2001:db8:1::')
    expect(maskIpv6('1:2:3')).toBeNull()
    expect(maskIpv6('1::2::3')).toBeNull()
  })
})

describe('redactLogValue', () => {
  it('masks strings, nested objects and errors', () => {
    expect(redactLogValue('plate AA1234BB')).toBe('plate AA****BB')
    expect(redactLogValue({ a: { plate: 'AA1234BB' }, list: ['roman@gmail.com'], n: 1 })).toEqual({
      a: { plate: 'AA****BB' },
      list: ['r***@g***.com'],
      n: 1
    })
    expect(String(redactLogValue(new Error('bad AA1234BB')))).toContain('AA****BB')
  })

  it('passes primitives through and survives circular objects', () => {
    expect(redactLogValue(5)).toBe(5)
    expect(redactLogValue(null)).toBeNull()
    const loop: Record<string, unknown> = {}
    loop.self = loop
    expect(typeof redactLogValue(loop)).toBe('string')
  })
})
