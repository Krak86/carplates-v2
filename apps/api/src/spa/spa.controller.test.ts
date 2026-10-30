import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const INDEX =
  '<!doctype html><html><head><title>old</title><meta name="description" content="old" /></head><body><div id="root"></div></body></html>'

const CATALOG_MODEL = {
  make: 'bmw',
  model: 'x5',
  makeName: 'BMW',
  modelName: 'X5',
  n: 96119,
  yearMin: 2000,
  yearMax: 2025,
  topBrand: 'BMW',
  topModel: 'X5',
  kind: 'ЛЕГКОВИЙ',
  indexable: true,
  stats: {
    years: [['2015', 5000]],
    registered: [],
    fuel: [['ДИЗЕЛЬНЕ ПАЛИВО', 57828]],
    body: [],
    color: [],
    regions: [['М.КИЇВ', 20000]]
  },
  siblings: [{ model: 'x3', modelName: 'X3', n: 33133 }]
}

describe('SpaController meta injection', () => {
  let app: NestFastifyApplication
  let dist: string

  beforeAll(async () => {
    dist = mkdtempSync(join(tmpdir(), 'spa-dist-'))
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
              title: 'Cars UA - AA1234BB - Toyota Camry 2015',
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
    const { CatalogService } = await import('../catalog/catalog.service.js')
    const catalog = {
      get: async (make: string, model: string) =>
        make === 'bmw' && model === 'x5'
          ? CATALOG_MODEL
          : make === 'bmw' && model === 'z3'
            ? { ...CATALOG_MODEL, model: 'z3', modelName: 'Z3', indexable: false }
            : null
    }
    const moduleRef = await Test.createTestingModule({
      controllers: [SpaController],
      providers: [
        { provide: PreviewService, useValue: previews },
        { provide: CatalogService, useValue: catalog }
      ]
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
    expect(html).toContain('<title>Cars UA - AA1234BB - Toyota Camry 2015</title>')
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
    expect(html).toContain('og:image" content="https://carsua.app/og/page/about.png"')
    expect(html).not.toContain('noindex')
  })

  it('gives a share alias its own noindex preview with itself as og:url', async () => {
    const html = await get('/go/ar?lang=en')
    expect(html).toContain('AR plate scanner')
    expect(html).toContain('og:image" content="https://carsua.app/og/page/go--ar.png?lang=en"')
    expect(html).toContain('og:url" content="https://carsua.app/go/ar"')
    expect(html).toContain('noindex')
  })

  it('treats an unknown share alias like any unknown path', async () => {
    const html = await get('/go/nope')
    expect(html).not.toContain('og/page/go--')
    expect(html).toContain('noindex')
  })

  it('injects a catalog page: indexable tags, h1 and sibling links in #root', async () => {
    const res = await app.inject({ method: 'GET', url: '/cars/bmw/x5' })
    expect(res.body).toContain('<title>BMW X5 в Україні')
    expect(res.body).toContain('<link rel="canonical" href="https://carsua.app/cars/bmw/x5">')
    expect(res.body).toContain('og/page/cars--bmw--x5.png')
    expect(res.body).toContain('hreflang="x-default"')
    expect(res.body).not.toContain('noindex')
    expect(res.body).toContain('<div id="root"><main><h1>BMW X5 в Україні</h1>')
    expect(res.body).toContain('<a href="/cars/bmw/x3">BMW X3</a>')
    expect(res.headers['cache-control']).toContain('s-maxage=86400')
  })

  it('marks a thin catalog page noindex without alternates', async () => {
    const html = await get('/cars/bmw/z3')
    expect(html).toContain('noindex')
    expect(html).not.toContain('hreflang')
  })

  it('treats an unknown catalog path like any unknown path', async () => {
    const res = await app.inject({ method: 'GET', url: '/cars/bmw/nothing' })
    expect(res.body).toContain('noindex')
    expect(res.body).not.toContain('<main>')
    expect(res.headers['cache-control']).toBe('no-cache')
  })

  it('falls back to home tags + noindex for an unknown path or plate', async () => {
    const html = await get('/ZZ0000ZZ')
    expect(html).toContain('og:title')
    expect(html).toContain('noindex')
  })

  it('picks up a replaced index.html without a restart (web deploy swaps the dist symlink)', async () => {
    writeFileSync(join(dist, 'index.html'), INDEX.replace('<div id="root">', '<div id="root" data-build="new">'))
    expect(await get('/about')).toContain('data-build="new"')
  })
})
