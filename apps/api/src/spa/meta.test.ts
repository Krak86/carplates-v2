import { describe, expect, it } from 'vitest'

import { injectMeta, renderMetaTags } from './meta.js'
import { STATIC_PAGES, resolveLang, vehiclePageText } from './spa-text.js'

const base = {
  siteUrl: 'https://carsua.app',
  path: '/AA1234BB',
  lang: 'ua' as const,
  title: 'T',
  description: 'D',
  image: 'https://carsua.app/og/AA1234BB.png'
}

describe('renderMetaTags', () => {
  it('includes og image dimensions and a large twitter card', () => {
    const html = renderMetaTags(base)
    expect(html).toContain('og:image:width" content="1200"')
    expect(html).toContain('og:image:height" content="630"')
    expect(html).toContain('summary_large_image')
    expect(html).toContain('og:locale" content="uk_UA"')
  })

  it('adds noindex only when asked', () => {
    expect(renderMetaTags(base)).not.toContain('robots')
    expect(renderMetaTags({ ...base, noindex: true })).toContain('noindex')
  })
})

describe('injectMeta', () => {
  it('replaces the placeholder title and description', () => {
    const out = injectMeta(
      '<head><title>old</title><meta name="description" content="old" /></head>',
      renderMetaTags(base)
    )
    expect(out).not.toContain('old')
    expect(out.match(/name="description"/g)).toHaveLength(1)
  })
})

describe('spa-text', () => {
  it('falls back to the default language', () => {
    expect(resolveLang('en')).toBe('en')
    expect(resolveLang('xx')).toBe('ua')
    expect(resolveLang(undefined)).toBe('ua')
  })

  it('has every language for every static route', () => {
    for (const langs of Object.values(STATIC_PAGES)) expect(Object.keys(langs).sort()).toEqual(['en', 'ru', 'ua'])
  })

  it('builds vehicle page text', () => {
    const t = vehiclePageText(
      'en',
      { value: 'AA1234BB', car: 'Toyota Camry', year: '2015', extra: ['Petrol'] },
      'plate'
    )
    expect(t.title).toBe('AA1234BB — Toyota Camry 2015 · Cars UA')
    expect(t.description).toContain('Toyota Camry, 2015, Petrol')
  })
})
