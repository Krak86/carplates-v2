import { describe, expect, it } from 'vitest'

import { renderRobots, renderSitemap, sitemapPaths } from './sitemap.js'

describe('sitemap', () => {
  it('lists indexable static pages, not per-device ones', () => {
    const paths = sitemapPaths()
    for (const p of ['/about', '/privacy', '/terms', '/stats', '/fuel', '/safety', '/news', '/race', '/relax']) {
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
      '/read/vin'
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

  it('points robots.txt at the sitemap', () => {
    expect(renderRobots('https://carsua.app')).toContain('Sitemap: https://carsua.app/sitemap.xml')
  })
})
