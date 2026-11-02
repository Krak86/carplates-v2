import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const INDEX =
  '<!doctype html><html><head><title>old</title><meta name="description" content="old" /></head><body><div id="root"></div></body></html>'

const LIVE_TOKEN = 'AAAAAAAAAAAAAAAAAAAAAA'
const DEAD_TOKEN = 'BBBBBBBBBBBBBBBBBBBBBB'

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

const CATALOG_MAKE = {
  make: 'bmw',
  makeName: 'BMW',
  n: 480666,
  modelCount: 56,
  topBrand: 'BMW',
  indexable: true,
  models: [{ model: 'x5', modelName: 'X5', n: 96119, yearMin: 2000, yearMax: 2025 }]
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
      makes: async () => [{ ...CATALOG_MAKE, models: undefined }],
      make: async (slug: string) =>
        slug === 'bmw' ? CATALOG_MAKE : slug === 'zaz' ? { ...CATALOG_MAKE, make: 'zaz', indexable: false } : null,
      get: async (make: string, model: string) =>
        make === 'bmw' && model === 'x5'
          ? CATALOG_MODEL
          : make === 'bmw' && model === 'z3'
            ? { ...CATALOG_MODEL, model: 'z3', modelName: 'Z3', indexable: false }
            : null
    }
    const { SharesService } = await import('../shares/shares.service.js')
    const shares = {
      metaFor: async (token: string) =>
        token === LIVE_TOKEN
          ? { plate: 'AA1234BB', expiresAt: new Date(Date.now() + 86_400_000), width: 1600, height: 900 }
          : null
    }
    const moduleRef = await Test.createTestingModule({
      controllers: [SpaController],
      providers: [
        { provide: PreviewService, useValue: previews },
        { provide: CatalogService, useValue: catalog },
        { provide: SharesService, useValue: shares }
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

  it('adds the section name and a lead sentence for other ?section= links', async () => {
    const html = await get('/AA1234BB?section=recalls&lang=en')
    expect(html).toContain('<title>Cars UA - AA1234BB - Toyota Camry 2015 - Recalls</title>')
    expect(html).toContain('content="Safety recalls for the model. AA1234BB')
    expect(await get('/AA1234BB?section=bogus')).toContain('<title>Cars UA - AA1234BB - Toyota Camry 2015</title>')
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
    expect(res.body).toContain('<div id="root"><main><nav aria-label="Навігація"><ol><li><a href="/">Головна</a></li>')
    expect(res.body).toContain('<li><a href="/cars/bmw">BMW</a></li><li>X5</li>')
    expect(res.body).toContain('<h1>BMW X5 в Україні</h1>')
    expect(res.body).toContain('<a href="/cars/bmw">Усі моделі BMW</a>')
    expect(res.body).toContain('<a href="/cars/bmw/x3">BMW X3</a>')
    expect(res.body).toContain('"@type":"BreadcrumbList"')
    expect(res.body).toContain('"item":"https://carsua.app/cars/bmw/x5"')
    expect(res.headers['cache-control']).toContain('s-maxage=86400')
  })

  it('serves the /cars index with the make list, breadcrumb data and the static page tags', async () => {
    const res = await app.inject({ method: 'GET', url: '/cars?lang=en' })
    expect(res.body).toContain('<title>Cars in Ukraine by make and model | Cars UA</title>')
    expect(res.body).toContain('<link rel="canonical" href="https://carsua.app/cars?lang=en">')
    expect(res.body).toContain('<h1>Cars in Ukraine by make</h1>')
    expect(res.body).toContain('<a href="/cars/bmw?lang=en">BMW</a>')
    expect(res.body).toContain('"@type":"BreadcrumbList"')
    expect(res.body).not.toContain('noindex')
    expect(res.headers['cache-control']).toContain('s-maxage=86400')
  })

  it('serves a /cars/:make page; a make without an indexable model is noindex', async () => {
    const res = await app.inject({ method: 'GET', url: '/cars/bmw' })
    expect(res.body).toContain('<title>BMW в Україні: моделі та кількість авто | Cars UA</title>')
    expect(res.body).toContain('<link rel="canonical" href="https://carsua.app/cars/bmw">')
    expect(res.body).toContain('og/page/cars--bmw.png')
    expect(res.body).toContain('<a href="/cars/bmw/x5">BMW X5</a> - 96')
    expect(res.body).not.toContain('noindex')
    expect(await get('/cars/zaz')).toContain('noindex')
  })

  it('treats an unknown make like any unknown path', async () => {
    const res = await app.inject({ method: 'GET', url: '/cars/nosuchmake' })
    expect(res.body).toContain('noindex')
    expect(res.body).not.toContain('<main>')
    expect(res.headers['cache-control']).toBe('no-cache')
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

  it('uses the shared photo as og:image on /<plate>?p=<token>, private and unindexed', async () => {
    const res = await app.inject({ method: 'GET', url: `/AA1234BB?p=${LIVE_TOKEN}` })
    expect(res.body).toContain(`og:image" content="https://carsua.app/api/shares/${LIVE_TOKEN}/image"`)
    expect(res.body).toContain('og:image:type" content="image/jpeg"')
    expect(res.body).toContain('og:image:width" content="1600"')
    expect(res.body).toContain('og:image:height" content="900"')
    expect(res.body).toContain('<title>Cars UA - AA1234BB - Toyota Camry 2015</title>')
    expect(res.body).toContain('noindex')
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.headers['x-robots-tag']).toBe('noindex')
    expect(res.headers['referrer-policy']).toBe('no-referrer')
  })

  it('answers an expired, deleted or malformed share token with a neutral "link expired" page', async () => {
    for (const p of [DEAD_TOKEN, 'not-a-token']) {
      const res = await app.inject({ method: 'GET', url: `/AA1234BB?p=${p}&lang=en` })
      expect(res.body).toContain('<title>Cars UA - link expired</title>')
      expect(res.body).not.toContain('AA1234BB')
      expect(res.body).not.toContain('/api/shares/')
      expect(res.body).toContain('noindex')
      expect(res.headers['cache-control']).toBe('no-store')
      expect(res.headers['referrer-policy']).toBe('no-referrer')
    }
  })

  it('ignores ?p= on static pages and the home page', async () => {
    const html = await get(`/about?p=${LIVE_TOKEN}`)
    expect(html).toContain('og:image" content="https://carsua.app/og/page/about.png"')
    expect(html).not.toContain('noindex')
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
