import { describe, expect, it } from 'vitest'

import { renderCatalogSitemap, renderRobots, renderSitemap, renderSitemapIndex, sitemapPaths } from './sitemap.js'

describe('sitemap', () => {
  it('lists indexable static pages, not per-device ones', () => {
    const paths = sitemapPaths()
    for (const p of [
      '/about',
      '/privacy',
      '/terms',
      '/contact',
      '/stats',
      '/fuel',
      '/safety',
      '/news',
      '/play',
      '/race',
      '/relax'
    ]) {
      expect(paths).toContain(p)
    }
    expect(paths).toContain('/advanced-search')
    for (const p of [
      '/read',
      '/read/body-types',
      '/read/sizes',
      '/read/fleet',
      '/read/plates',
      '/read/generations',
      '/read/vin',
      '/read/recalls'
    ])
      expect(paths).toContain(p)
    expect(paths).not.toContain('/history')
    expect(paths).not.toContain('/favorites')
  })

  it('renders absolute URLs with the home page as the bare origin', () => {
    const xml = renderSitemap('https://carsua.app')
    expect(xml).toContain('<loc>https://carsua.app</loc>')
    expect(xml).toContain('<loc>https://carsua.app/about</loc>')
    expect(xml).toContain('<loc>https://carsua.app/read/body-types</loc>')
  })

  it('lists every language of a page with hreflang alternates', () => {
    const xml = renderSitemap('https://carsua.app')
    expect(xml).toContain('<loc>https://carsua.app/about?lang=ru</loc>')
    expect(xml).toContain('<loc>https://carsua.app/?lang=en</loc>')
    expect(xml).toContain('hreflang="uk" href="https://carsua.app/about"')
    expect(xml).toContain('hreflang="x-default" href="https://carsua.app/about"')
    expect(xml.match(/<url>/g)).toHaveLength(sitemapPaths().length * 3)
  })

  it('lists the sitemap files in an index', () => {
    const xml = renderSitemapIndex('https://carsua.app')
    expect(xml).toContain('<sitemapindex')
    expect(xml).toContain('<loc>https://carsua.app/sitemap-pages.xml</loc>')
    expect(xml).toContain('<loc>https://carsua.app/sitemap-cars.xml</loc>')
  })

  it('renders catalog pages in every language with hreflang', () => {
    const xml = renderCatalogSitemap('https://carsua.app', [['bmw', '3series']])
    expect(xml).toContain('<loc>https://carsua.app/cars/bmw/3series</loc>')
    expect(xml).toContain('<loc>https://carsua.app/cars/bmw/3series?lang=en</loc>')
    expect(xml).toContain('hreflang="x-default" href="https://carsua.app/cars/bmw/3series"')
    expect(xml.match(/<url>/g)).toHaveLength(3)
  })

  it('lists the indexable make pages before the model pages', () => {
    const xml = renderCatalogSitemap('https://carsua.app', [['bmw', '3series']], ['bmw'])
    expect(xml).toContain('<loc>https://carsua.app/cars/bmw</loc>')
    expect(xml.indexOf('/cars/bmw</loc>')).toBeLessThan(xml.indexOf('/cars/bmw/3series</loc>'))
    expect(xml.match(/<url>/g)).toHaveLength(6)
  })

  it('lists the /cars index among the static pages', () => {
    expect(sitemapPaths()).toContain('/cars')
  })

  it('points robots.txt at the sitemap', () => {
    expect(renderRobots('https://carsua.app')).toContain('Sitemap: https://carsua.app/sitemap.xml')
  })

  it('blocks per-plate cards but allows the generic ones', () => {
    const robots = renderRobots('https://carsua.app')
    expect(robots).toContain('Disallow: /api/')
    expect(robots).toContain('Disallow: /og/\n')
    expect(robots).toContain('Allow: /og/default.png')
    expect(robots).toContain('Allow: /og/page/')
  })
})
