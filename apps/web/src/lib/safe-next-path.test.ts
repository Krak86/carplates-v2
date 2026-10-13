import { describe, expect, it } from 'vitest'

import { safeNextPath } from '@/lib/safe-next-path'

describe('safeNextPath', () => {
  it('keeps same-origin relative paths', () => {
    expect(safeNextPath('/profile')).toBe('/profile')
    expect(safeNextPath('/profile?tab=devices#x')).toBe('/profile?tab=devices#x')
  })

  it('rejects absolute, protocol-relative and backslash tricks', () => {
    expect(safeNextPath('https://evil.example')).toBe('/')
    expect(safeNextPath('//evil.example')).toBe('/')
    expect(safeNextPath('/\\evil.example')).toBe('/')
    expect(safeNextPath('javascript:alert(1)')).toBe('/')
    expect(safeNextPath('/a\nb')).toBe('/')
  })

  it('falls back when missing', () => {
    expect(safeNextPath(null)).toBe('/')
    expect(safeNextPath('', '/home')).toBe('/home')
  })
})
