import type { ExecutionContext } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

import { GLOBAL_THROTTLE } from './throttle.js'

const ctxFor = (url: string): ExecutionContext =>
  ({ switchToHttp: () => ({ getRequest: () => ({ url }) }) }) as unknown as ExecutionContext

describe('GLOBAL_THROTTLE.skipIf', () => {
  const skipIf = (GLOBAL_THROTTLE as { skipIf: (c: ExecutionContext) => boolean }).skipIf

  it('counts /api/* requests', () => {
    expect(skipIf(ctxFor('/api/plate/AA1234AA'))).toBe(false)
  })

  it('does not count assets, previews, health or SPA routes', () => {
    for (const url of ['/assets/index.js', '/og/AA1234AA.png', '/healthz', '/about', '/sitemap.xml']) {
      expect(skipIf(ctxFor(url))).toBe(true)
    }
  })
})
