import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const INDEX =
  '<!doctype html><html><head><title>old</title><meta name="description" content="old" /></head><body><div id="root"></div></body></html>'

describe('SpaController meta injection', () => {
  let app: NestFastifyApplication

  beforeAll(async () => {
    const dist = mkdtempSync(join(tmpdir(), 'spa-dist-'))
    writeFileSync(join(dist, 'index.html'), INDEX)
    vi.stubEnv('WEB_DIST_DIR', dist)
    vi.stubEnv('PUBLIC_SITE_URL', 'https://carsua.app')

    // loadEnv() caches on first call, so the controller must be imported after the env is stubbed.
    const { SpaController } = await import('./spa.controller.js')
    const { PreviewService } = await import('./preview.service.js')
    const previews = {
      describe: async (query: string) =>
        query === 'AA1234BB'
          ? {
              kind: 'plate',
              value: 'AA1234BB',
              title: 'AA1234BB — Toyota Camry 2015 · Cars UA',
              description: 'AA1234BB: Toyota Camry',
              card: {},
              brandSlug: null
            }
          : null,
      describeValue: async (p: { title: string; description: string }) => ({
        title: p.title,
        description: `Estimated EU value: ~€3,000–4,000. ${p.description}`
      })
    }
    const moduleRef = await Test.createTestingModule({
      controllers: [SpaController],
      providers: [{ provide: PreviewService, useValue: previews }]
    }).compile()
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  afterAll(async () => {
    await app.close()
    vi.unstubAllEnvs()
  })

  const get = async (url: string): Promise<string> => (await app.inject({ method: 'GET', url })).body

  it('injects per-vehicle tags with noindex on a known plate', async () => {
    const html = await get('/AA1234BB?lang=ua')
    expect(html).toContain('<title>AA1234BB — Toyota Camry 2015 · Cars UA</title>')
    expect(html).toContain('og:image" content="https://carsua.app/og/AA1234BB.png"')
    expect(html).toContain('noindex')
    expect(html).not.toContain('>old<')
  })

  it('passes ?lang= through to the og:image URL', async () => {
    expect(await get('/AA1234BB?lang=en')).toContain('/og/AA1234BB.png?lang=en')
  })

  it('puts the estimated value in the description for ?section=value only', async () => {
    expect(await get('/AA1234BB?section=value')).toContain('content="Estimated EU value: ~€3,000–4,000. AA1234BB')
    expect(await get('/AA1234BB')).not.toContain('Estimated EU value')
  })

  it('serves static page tags without noindex', async () => {
    const html = await get('/about')
    expect(html).toContain('og:image" content="https://carsua.app/og/default.png"')
    expect(html).not.toContain('noindex')
  })

  it('falls back to home tags + noindex for an unknown path or plate', async () => {
    const html = await get('/ZZ0000ZZ')
    expect(html).toContain('og:title')
    expect(html).toContain('noindex')
  })
})
