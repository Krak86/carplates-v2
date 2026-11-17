import { describe, expect, it } from 'vitest'

import { needsPlainBuild } from './ort-wasm-paths'

const safari = (v: number) =>
  `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${v}.1 Safari/605.1.15`
const chrome =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

describe('needsPlainBuild', () => {
  it('uses the plain build on Safari < 26 without WebGPU', () => {
    expect(needsPlainBuild(safari(18), false)).toBe(true)
  })
  it('keeps asyncify on Safari 26+, with WebGPU, and on Chrome', () => {
    expect(needsPlainBuild(safari(26), false)).toBe(false)
    expect(needsPlainBuild(safari(18), true)).toBe(false)
    expect(needsPlainBuild(chrome, false)).toBe(false)
  })
})
