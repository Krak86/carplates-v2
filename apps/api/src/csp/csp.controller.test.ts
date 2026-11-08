import { APP_GUARD } from '@nestjs/core'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { OriginGuard } from '../common/origin.guard.js'
import { CSP_REPORT_THROTTLE, GLOBAL_THROTTLE } from '../common/throttle.js'
import { CspController } from './csp.controller.js'
import { registerCspParsers } from './csp-parsers.js'
import { CspService } from './csp.service.js'

const captureMessage = vi.fn()
const scope = {
  setLevel: vi.fn(),
  setTags: vi.fn(),
  setContext: vi.fn(),
  setFingerprint: vi.fn()
}

vi.mock('@sentry/nestjs', () => ({
  captureMessage: (...args: unknown[]) => captureMessage(...args),
  withScope: (fn: (s: typeof scope) => void) => fn(scope)
}))

const legacy = (blocked: string, extra: Record<string, unknown> = {}) => ({
  'csp-report': {
    'document-uri': 'https://carsua.app/plate/AA1234AA?token=secret',
    'blocked-uri': blocked,
    'effective-directive': 'script-src-elem',
    disposition: 'report',
    ...extra
  }
})

const modern = (blocked: string, type = 'csp-violation') => [
  {
    type,
    url: 'https://carsua.app/',
    body: {
      documentURL: 'https://carsua.app/',
      blockedURL: blocked,
      effectiveDirective: 'frame-src',
      disposition: 'report'
    }
  }
]

describe('POST /api/csp-report', () => {
  let app: NestFastifyApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({ ...GLOBAL_THROTTLE, throttlers: [{ name: 'medium', ttl: 60_000, limit: 150 }] })
      ],
      controllers: [CspController],
      providers: [
        CspService,
        { provide: APP_GUARD, useClass: OriginGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard }
      ]
    }).compile()
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    registerCspParsers(app.getHttpAdapter().getInstance())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  afterAll(() => app.close())
  beforeEach(() => vi.clearAllMocks())

  const post = (
    payload: unknown,
    contentType = 'application/csp-report',
    headers: Record<string, string> = {},
    ip = '10.0.0.1'
  ) =>
    app.inject({
      method: 'POST',
      url: '/api/csp-report',
      remoteAddress: ip,
      headers: { 'content-type': contentType, ...headers },
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload)
    })

  it('accepts application/csp-report, answers 204 uncached and forwards to Sentry', async () => {
    const res = await post(legacy('https://evil.example/x.js?k=1'))
    expect(res.statusCode).toBe(204)
    expect(res.headers['cache-control']).toBe('no-store')
    expect(captureMessage).toHaveBeenCalledTimes(1)
    expect(captureMessage).toHaveBeenCalledWith('CSP script-src-elem blocked https://evil.example/x.js')
    expect(scope.setFingerprint).toHaveBeenCalledWith(['csp-violation', 'script-src-elem', 'https://evil.example'])
  })

  it('accepts application/reports+json (Reporting API batch)', async () => {
    const res = await post(modern('https://tracker.example/embed'), 'application/reports+json')
    expect(res.statusCode).toBe(204)
    expect(captureMessage).toHaveBeenCalledWith('CSP frame-src blocked https://tracker.example/embed')
  })

  it('ignores non-CSP reports in a Reporting API batch', async () => {
    const res = await post(modern('https://tracker.example/embed', 'deprecation'), 'application/reports+json')
    expect(res.statusCode).toBe(204)
    expect(captureMessage).not.toHaveBeenCalled()
  })

  it.each([
    'chrome-extension://abc/inject.js',
    'moz-extension://abc/x.js',
    'safari-extension://abc/x.js',
    'about',
    'data',
    'data:image/png;base64,AAAA',
    ''
  ])('drops the noise blocked-uri %j', async blocked => {
    expect((await post(legacy(blocked))).statusCode).toBe(204)
    expect((await post(modern(blocked), 'application/reports+json')).statusCode).toBe(204)
    expect(captureMessage).not.toHaveBeenCalled()
  })

  it('drops the LiveIntent hosts Disqus injects, but not look-alikes', async () => {
    for (const blocked of [
      'https://rp.liadm.com/j?did=1',
      'https://d-code.liadm.com/did-0049.min.js',
      'https://liadm.com/'
    ]) {
      expect((await post(legacy(blocked))).statusCode).toBe(204)
    }
    expect(captureMessage).not.toHaveBeenCalled()
    await post(legacy('https://notliadm.com/x.js'))
    expect(captureMessage).toHaveBeenCalledTimes(1)
  })

  it('drops a violation whose script comes from an extension', async () => {
    await post(legacy('inline', { 'source-file': 'chrome-extension://abc/content.js' }))
    expect(captureMessage).not.toHaveBeenCalled()
  })

  it('keeps inline and eval violations', async () => {
    await post(legacy('inline'))
    await post(legacy('eval'))
    expect(captureMessage).toHaveBeenCalledTimes(2)
  })

  it('never forwards a query string or an opaque path token', async () => {
    await post(legacy('https://evil.example/a/AAAAAAAAAAAAAAAAAAAAAA/b?secret=1#h'))
    const [message] = captureMessage.mock.calls[0] as [string]
    expect(message).toBe('CSP script-src-elem blocked https://evil.example/a/:token/b')
    expect(scope.setContext).toHaveBeenCalledWith(
      'csp',
      expect.objectContaining({ document: 'https://carsua.app/plate/AA1234AA' })
    )
  })

  it('rejects malformed bodies with 400 and sends nothing', async () => {
    expect((await post('{not json')).statusCode).toBe(400)
    expect((await post('{not json', 'application/reports+json')).statusCode).toBe(400)
    expect((await post({ unrelated: true })).statusCode).toBe(400)
    expect((await post('"a string"')).statusCode).toBe(400)
    expect((await post({ 'csp-report': { 'blocked-uri': 42 } })).statusCode).toBe(400)
    expect(captureMessage).not.toHaveBeenCalled()
  })

  it('is exempt from OriginGuard: cross-site and foreign-Origin reports still land', async () => {
    const res = await post(legacy('https://evil.example/x.js'), 'application/csp-report', {
      'sec-fetch-site': 'cross-site',
      origin: 'https://other.example'
    })
    expect(res.statusCode).toBe(204)
    expect(captureMessage).toHaveBeenCalledTimes(1)
  })

  it('throttles a burst from one IP with 429 and leaves other IPs alone', async () => {
    const limit = CSP_REPORT_THROTTLE.medium.limit
    const burst = await Promise.all(
      Array.from({ length: limit + 5 }, () => post(legacy('inline'), 'application/csp-report', {}, '10.0.0.9'))
    )
    expect(burst.filter(r => r.statusCode === 204)).toHaveLength(limit)
    expect(burst.filter(r => r.statusCode === 429)).toHaveLength(5)
    expect((await post(legacy('inline'), 'application/csp-report', {}, '10.0.0.10')).statusCode).toBe(204)
  })
})
