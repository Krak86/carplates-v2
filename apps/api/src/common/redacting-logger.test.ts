import { describe, expect, it, vi } from 'vitest'
import { RedactingLogger } from './redacting-logger.js'

function capture(run: (logger: RedactingLogger) => void, json = true): string {
  const lines: string[] = []
  const spy = vi.spyOn(console, 'log').mockImplementation((line: unknown) => void lines.push(String(line)))
  const errSpy = vi.spyOn(console, 'error').mockImplementation((line: unknown) => void lines.push(String(line)))
  try {
    run(new RedactingLogger({ json, forceConsole: true, colors: false }))
  } finally {
    spy.mockRestore()
    errSpy.mockRestore()
  }
  return lines.join('\n')
}

describe('RedactingLogger', () => {
  it('masks string messages and the context', () => {
    const out = capture(l => l.log('lookup AA1234BB for roman@gmail.com', 'Plate AA1234BB'))
    expect(out).toContain('AA****BB')
    expect(out).toContain('r***@g***.com')
    expect(out).not.toContain('AA1234BB')
    expect(out).not.toContain('roman@gmail.com')
  })

  it('masks object messages', () => {
    const out = capture(l => l.warn({ plate: 'AA1234BB', ip: '203.0.113.42' }))
    expect(out).toContain('AA****BB')
    expect(out).toContain('203.0.113.0')
    expect(out).not.toContain('203.0.113.42')
  })

  it('masks error messages and stacks in text mode', () => {
    const out = capture(l => l.error('failed AA1234BB', 'Error: boom AA1234BB\n    at x (file.ts:1:1)', 'Ctx'), false)
    expect(out).not.toContain('AA1234BB')
    expect(out).toContain('AA****BB')
  })
})
