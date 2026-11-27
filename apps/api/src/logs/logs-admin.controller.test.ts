import { UnauthorizedException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminGuard, SessionGuard } from '../auth/session.guard.js'
import { LogsAdminController } from './logs-admin.controller.js'
import { LogsService } from './logs.service.js'

const logs = {
  query: vi.fn(async () => ({ status: 'ok', lines: [], truncated: false, from: 'a', to: 'b' })),
  containers: vi.fn(async () => ({ status: 'ok', containers: ['carsua-api-blue-1'] }))
}

/** Stands in for SessionGuard: user id + role come from headers, no header = signed out. */
const fakeSession = {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string>; sessionUser?: unknown }>()
    const id = req.headers['x-test-user']
    if (!id) throw new UnauthorizedException('Sign-in required')
    req.sessionUser = { id, role: req.headers['x-test-role'] ?? 'user' }
    return true
  }
}

describe('LogsAdminController over HTTP', () => {
  let app: NestFastifyApplication
  const admin = { 'x-test-user': 'admin-1', 'x-test-role': 'admin' }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [LogsAdminController],
      providers: [
        { provide: LogsService, useValue: logs },
        AdminGuard,
        { provide: SessionGuard, useValue: fakeSession }
      ]
    }).compile()
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })
  afterAll(async () => app.close())
  beforeEach(() => vi.clearAllMocks())

  it('401 when signed out and 403 for a non-admin, on both routes, without touching Loki', async () => {
    for (const url of ['/api/admin/logs', '/api/admin/logs/containers']) {
      expect((await app.inject({ method: 'GET', url })).statusCode).toBe(401)
      const user = { 'x-test-user': 'u1', 'x-test-role': 'user' }
      expect((await app.inject({ method: 'GET', url, headers: user })).statusCode).toBe(403)
    }
    expect(logs.query).not.toHaveBeenCalled()
    expect(logs.containers).not.toHaveBeenCalled()
  })

  it('serves an admin with no-store and passes the parsed query + admin id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/logs?container=carsua-api-blue-1&level=error,warn&q=timeout&limit=50',
      headers: admin
    })
    expect(res.statusCode).toBe(200)
    expect(res.headers['cache-control']).toBe('no-store')
    expect(logs.query).toHaveBeenCalledWith(
      expect.objectContaining({
        container: 'carsua-api-blue-1',
        level: ['error', 'warn'],
        q: 'timeout',
        limit: 50,
        direction: 'backward'
      }),
      'admin-1'
    )
  })

  it('lists containers for an admin with no-store', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/admin/logs/containers', headers: admin })
    expect(res.statusCode).toBe(200)
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.json()).toEqual({ status: 'ok', containers: ['carsua-api-blue-1'] })
  })

  it('rejects bad params with 400 (injection-shaped container, unknown level, huge limit, inverted window)', async () => {
    for (const qs of [
      'container=x%22%7D',
      'container=a%20b',
      'level=fatal',
      'limit=501',
      'limit=0',
      'from=2026-11-27T10:00:00Z&to=2026-11-27T09:00:00Z',
      'from=yesterday',
      `q=${'a'.repeat(201)}`
    ]) {
      const res = await app.inject({ method: 'GET', url: `/api/admin/logs?${qs}`, headers: admin })
      expect(res.statusCode, qs).toBe(400)
    }
    expect(logs.query).not.toHaveBeenCalled()
  })
})
