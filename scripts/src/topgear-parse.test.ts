import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { modelPages, parseSitemapUrls, parseTopgearPage, slugYearRange, toIsoDate } from './topgear-parse.js'

const page = (name: string): string =>
  readFileSync(join(import.meta.dirname, 'fixtures', 'topgear', `${name}.html`), 'utf8')

describe('parseTopgearPage', () => {
  it('reads a string score, ISO date, headline and decoded meta-description blurb', () => {
    expect(parseTopgearPage(page('kia-ceed-sportswagon'))).toEqual({
      title: "Kia Cee'd Sportswagon",
      rating: 6,
      bestRating: 10,
      publishedAt: '2015-01-13',
      blurb:
        "Second generation Cee'd estate illustrates the fast-developing maturity of the Korean giant. Near premium-look alternative to the Focus and Golf."
    })
  })

  it('keeps a year range in the title and a numeric bestRating', () => {
    const r = parseTopgearPage(page('kia-sportage-2017-2021'))
    expect(r).toMatchObject({ title: 'Kia Sportage (2017-2021)', rating: 7, bestRating: 10, publishedAt: '2018-07-25' })
  })

  it('tolerates "9/10", a Drupal date and a missing headline (title from the Car name)', () => {
    expect(parseTopgearPage(page('noble-m600'))).toMatchObject({
      title: 'Noble M600',
      rating: 9,
      bestRating: 10,
      publishedAt: '2015-01-13'
    })
  })

  it('returns null for the 404 page', () => {
    expect(parseTopgearPage(page('bmw-m3-404'))).toBeNull()
  })

  it('gives a null rating (and bestRating) when the page has no score', () => {
    const ld = JSON.stringify({
      '@type': 'Car',
      name: 'Foo Bar Review 2024',
      review: { datePublished: '2024-05-16T05:00:00+0100' }
    })
    const html = `<head><script type="application/ld+json">${ld}</script></head>`
    expect(parseTopgearPage(html)).toEqual({
      title: 'Foo Bar',
      rating: null,
      bestRating: null,
      publishedAt: '2024-05-16',
      blurb: null
    })
  })

  it('skips malformed JSON-LD blocks', () => {
    const ld = JSON.stringify({
      '@type': 'Car',
      name: 'Ok',
      review: { reviewRating: { ratingValue: 8, bestRating: '10' } }
    })
    const html = `<script type="application/ld+json">{oops</script><script type="application/ld+json">${ld}</script>`
    expect(parseTopgearPage(html)).toMatchObject({ title: 'Ok', rating: 8, bestRating: 10 })
  })
})

describe('sitemap', () => {
  const xml = `<urlset>
    <url><loc>https://www.topgear.com/car-reviews/kia</loc></url>
    <url><loc>https://www.topgear.com/car-reviews/kia/ceed</loc></url>
    <url><loc>https://www.topgear.com/car-reviews/kia/ceed</loc></url>
    <url><loc>https://www.topgear.com/car-reviews/kia/ceed/buying</loc></url>
    <url><loc>https://www.topgear.com/car-reviews/kia/sportage-2017-2021</loc></url>
    <url><loc>https://www.topgear.com/car-reviews/kia/first-drive-3</loc></url>
    <url><loc>https://www.topgear.com/car-reviews/kia/report</loc></url>
    <url><loc>https://www.topgear.com/car-news/foo</loc></url>
  </urlset>`

  it('keeps only unique make/model pages, not article series', () => {
    expect(modelPages(parseSitemapUrls(xml)).map(m => [m.makeSlug, m.modelSlug, m.path])).toEqual([
      ['kia', 'ceed', '/car-reviews/kia/ceed'],
      ['kia', 'sportage-2017-2021', '/car-reviews/kia/sportage-2017-2021']
    ])
  })
})

describe('slugYearRange', () => {
  it('reads a range, ignores a lone year and duplicate suffixes', () => {
    expect(slugYearRange('sportage-2017-2021')).toEqual({ yearFrom: 2017, yearTo: 2021 })
    expect(slugYearRange('e-niro-2018-2022')).toEqual({ yearFrom: 2018, yearTo: 2022 })
    expect(slugYearRange('ceed')).toEqual({ yearFrom: null, yearTo: null })
    expect(slugYearRange('sorento-0')).toEqual({ yearFrom: null, yearTo: null })
    expect(slugYearRange('model-2021')).toEqual({ yearFrom: null, yearTo: null })
  })
})

describe('toIsoDate', () => {
  it('handles ISO, US-style and garbage', () => {
    expect(toIsoDate('2015-01-13T15:04:59+0000')).toBe('2015-01-13')
    expect(toIsoDate('Tue, 01/13/2015 - 15:04')).toBe('2015-01-13')
    expect(toIsoDate('yesterday')).toBeNull()
    expect(toIsoDate(undefined)).toBeNull()
  })
})
