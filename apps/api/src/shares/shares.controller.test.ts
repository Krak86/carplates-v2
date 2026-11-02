import { Readable } from 'node:stream'

import { GoneException, NotFoundException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { ThrottlerModule } from '@nestjs/throttler'
import { Test } from '@nestjs/testing'
import multipart from '@fastify/multipart'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { SessionGuard } from '../auth/session.guard.js'
import { SharePrivacyHeadersGuard, ShareImageInterceptor, UserThrottlerGuard } from './share-http.js'
import { SharesController } from './shares.controller.js'
import { SharesService } from './shares.service.js'

const TOKEN = 'AAAAAAAAAAAAAAAAAAAAAA'
const ID = '3b0f7c1e-6f0b-4c6e-9b53-0a1f9a5f6a11'

const shares = {
  create: vi.fn(),
  listMine: vi.fn(async () => ({ shares: [], max: 3 })),
  remove: vi.fn(async (_user: string, id: string) => {
    if (id !== ID) throw new NotFoundException('Share not found')
  }),
  retouch: vi.fn(async () => ({ facesBlurred: 1, originalSize: null, storedSize: null })),
  dropOriginal: vi.fn(async () => undefined),
  ownImage: vi.fn(async () => ({ stream: Readable.from([Buffer.from('jpeg')]), length: 4, maxAgeS: 300 })),
  describe: vi.fn(async (token: string) => {
    if (token !== TOKEN) throw new GoneException('SHARE_EXPIRED')
    return { plate: 'АА1234ВВ', candidates: [], expiresAt: '2026-11-09T00:00:00.000Z' }
  }),
  image: vi.fn(async (token: string) => {
    if (token !== TOKEN) throw new GoneException('SHARE_EXPIRED')
    return { stream: Readable.from([Buffer.from('jpeg')]), length: 4, maxAgeS: 90 }
  })
}

/** Stands in for SessionGuard: the test user comes from a header. */
const fakeSession = {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string>; sessionUser?: { id: string } }>()
    const id = req.headers['x-test-user']
    if (!id) return false
    req.sessionUser = { id }
    return true
  }
}

describe('SharesController over HTTP', () => {
  let app: NestFastifyApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }] })],
      controllers: [SharesController],
      providers: [
        { provide: SharesService, useValue: shares },
        SharePrivacyHeadersGuard,
        ShareImageInterceptor,
        UserThrottlerGuard
      ]
    })
      .overrideGuard(SessionGuard)
      .useValue(fakeSession)
      .compile()
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await app.register(multipart as never, { limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 4 } })
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  afterAll(() => app.close())

  const inject = (method: 'GET' | 'POST' | 'DELETE', url: string, user?: string, payload?: object) =>
    app.inject({ method, url, headers: user ? { 'x-test-user': user } : {}, ...(payload && { payload }) })

  it('serves the metadata without indexing, referrer or caching', async () => {
    const res = await inject('GET', `/api/shares/${TOKEN}`)
    expect(res.statusCode).toBe(200)
    expect(res.headers['x-robots-tag']).toBe('noindex')
    expect(res.headers['referrer-policy']).toBe('no-referrer')
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.json()).toMatchObject({ plate: 'АА1234ВВ' })
  })

  it('streams the image with a private Cache-Control no longer than the time left', async () => {
    const res = await inject('GET', `/api/shares/${TOKEN}/image`)
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('image/jpeg')
    expect(res.headers['cache-control']).toBe('private, max-age=90')
    expect(res.headers['x-robots-tag']).toBe('noindex')
    expect(res.headers['referrer-policy']).toBe('no-referrer')
    expect(res.rawPayload.toString()).toBe('jpeg')
  })

  it('serves the owner preview by id, only with a session', async () => {
    expect((await inject('GET', `/api/shares/${ID}/preview`)).statusCode).toBe(403)
    const res = await inject('GET', `/api/shares/${ID}/preview`, 'u1')
    expect(res.statusCode).toBe(200)
    expect(res.headers['cache-control']).toBe('private, max-age=300')
    expect(res.headers['x-robots-tag']).toBe('noindex')
    expect((await inject('GET', '/api/shares/not-a-uuid/preview', 'u1')).statusCode).toBe(400)
  })

  it('answers an expired or unknown link with 410 and still sends the privacy headers', async () => {
    for (const url of ['/api/shares/BBBBBBBBBBBBBBBBBBBBBB', '/api/shares/BBBBBBBBBBBBBBBBBBBBBB/image']) {
      const res = await inject('GET', url)
      expect(res.statusCode).toBe(410)
      expect(res.headers['x-robots-tag']).toBe('noindex')
      expect(res.headers['referrer-policy']).toBe('no-referrer')
    }
  })

  it('needs a session for create, list and delete (the token routes stay public)', async () => {
    expect((await inject('POST', '/api/shares')).statusCode).toBe(403)
    expect((await inject('GET', '/api/shares')).statusCode).toBe(403)
    expect((await inject('DELETE', `/api/shares/${ID}`)).statusCode).toBe(403)
    expect((await inject('GET', '/api/shares', 'u1')).statusCode).toBe(200)
  })

  it('deletes with 204, 404 for another id and 400 for a malformed one', async () => {
    expect((await inject('DELETE', `/api/shares/${ID}`, 'u1')).statusCode).toBe(204)
    expect(shares.remove).toHaveBeenCalledWith('u1', ID)
    expect((await inject('DELETE', '/api/shares/11111111-1111-4111-8111-111111111111', 'u1')).statusCode).toBe(404)
    expect((await inject('DELETE', '/api/shares/nope', 'u1')).statusCode).toBe(400)
  })

  it('retouches with validated strokes, only for the owner session', async () => {
    const body = { strokes: [{ mode: 'add', radius: 0.05, points: [[0.1, 0.2]] }] }
    expect((await inject('POST', `/api/shares/${ID}/retouch`, undefined, body)).statusCode).toBe(403)
    const res = await inject('POST', `/api/shares/${ID}/retouch`, 'u1', body)
    expect(res.statusCode).toBe(200)
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.json()).toEqual({ removed: { facesBlurred: 1, originalSize: null, storedSize: null } })
    expect(shares.retouch).toHaveBeenCalledWith('u1', ID, body.strokes)
    for (const bad of [
      { strokes: [{ mode: 'add', radius: 0.9, points: [[0.1, 0.2]] }] },
      { strokes: [{ mode: 'blur', radius: 0.05, points: [[0.1, 0.2]] }] },
      { strokes: [{ mode: 'add', radius: 0.05, points: [[1.5, 0.2]] }] },
      { strokes: [{ mode: 'add', radius: 0.05, points: [] }] }
    ])
      expect((await inject('POST', `/api/shares/${ID}/retouch`, 'u1', bad)).statusCode).toBe(400)
  })

  it('drops the original with 204', async () => {
    expect((await inject('DELETE', `/api/shares/${ID}/original`)).statusCode).toBe(403)
    expect((await inject('DELETE', `/api/shares/${ID}/original`, 'u1')).statusCode).toBe(204)
    expect(shares.dropOriginal).toHaveBeenCalledWith('u1', ID)
  })

  it('limits creating to 10 per hour per user, not per IP', async () => {
    // No multipart body: the handler answers 4xx, but the guard has already counted the call.
    const statuses: number[] = []
    for (let i = 0; i < 11; i++) statuses.push((await inject('POST', '/api/shares', 'thrower')).statusCode)
    expect(statuses.slice(0, 10).every(s => s !== 429)).toBe(true)
    expect(statuses[10]).toBe(429)
    // Same IP, another account: its own quota.
    expect((await inject('POST', '/api/shares', 'other')).statusCode).not.toBe(429)
  })
})
