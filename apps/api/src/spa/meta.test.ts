import { describe, expect, it } from 'vitest'

import { injectMeta, renderHeroPreload, renderMetaTags } from './meta.js'
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

  it('emits JSON-LD once and never lets it close the script element', () => {
    const tags = renderMetaTags({ ...base, jsonLd: { name: '</script><b>' } })
    expect(tags.match(/application\/ld\+json/g)).toHaveLength(1)
    expect(tags).toContain('\\u003c/script>')
    expect(renderMetaTags(base)).not.toContain('ld+json')
  })

  it('escapes markup and quotes in the title, description, image and og:url of every tag', () => {
    const evil = '<script>alert(1)</script>"'
    const tags = renderMetaTags({ ...base, title: evil, description: evil, image: evil, ogUrl: evil })
    expect(tags).not.toContain('<script>')
    expect(tags).toContain('<title>&lt;script&gt;alert(1)&lt;/script&gt;&quot;</title>')
    expect(tags).toContain('name="description" content="&lt;script&gt;alert(1)&lt;/script&gt;&quot;"')
    expect(tags).toContain('og:url" content="&lt;script&gt;')
    // an attribute-breaking quote never survives unescaped inside any content="..." value
    for (const [, value] of tags.matchAll(/content="([^"]*)"/g)) expect(value).not.toMatch(/[<>]/)
  })

  it('escapes an ampersand so a query string cannot inject a second attribute', () => {
    const tags = renderMetaTags({ ...base, image: 'https://x.test/a.png?b=1&c="onload="x' })
    expect(tags).toContain('a.png?b=1&amp;c=&quot;onload=&quot;x')
  })

  it('adds noindex only when asked', () => {
    expect(renderMetaTags(base)).not.toContain('robots')
    expect(renderMetaTags({ ...base, noindex: true })).toContain('noindex')
  })

  it('self-canonicalises each language and lists hreflang alternates when asked', () => {
    const html = renderMetaTags({ ...base, path: '/about', lang: 'ru', alternates: true })
    expect(html).toContain('rel="canonical" href="https://carsua.app/about?lang=ru"')
    expect(html).toContain('hreflang="en" href="https://carsua.app/about?lang=en"')
    expect(html).toContain('hreflang="x-default" href="https://carsua.app/about"')
    expect(renderMetaTags(base)).not.toContain('hreflang')
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

  it('removes the background avif preload only when the page preloads its hero photo', () => {
    const html =
      '<head><link rel="preload" as="image" type="image/avif" href="/assets/bg.avif" fetchpriority="high"></head>'
    const withHero = injectMeta(html, renderHeroPreload('https://thumb.example/car.jpg'))
    expect(withHero).not.toContain('bg.avif')
    expect(withHero.match(/fetchpriority="low"/g)).toHaveLength(1)
    expect(injectMeta(html, renderMetaTags(base))).toContain('href="/assets/bg.avif" fetchpriority="high">')
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

  it('keeps static page titles and descriptions within preview limits and unique per language', () => {
    for (const lang of ['ua', 'ru', 'en'] as const) {
      const titles = new Set<string>()
      const descriptions = new Set<string>()
      for (const [path, langs] of Object.entries(STATIC_PAGES)) {
        const { title, description } = langs[lang]
        expect(title.length, `${path} ${lang} title`).toBeLessThanOrEqual(65)
        expect(description.length, `${path} ${lang} description`).toBeLessThanOrEqual(200)
        expect(titles.has(title), `${path} ${lang} duplicate title`).toBe(false)
        expect(descriptions.has(description), `${path} ${lang} duplicate description`).toBe(false)
        titles.add(title)
        descriptions.add(description)
      }
    }
  })

  it('builds vehicle page text', () => {
    const t = vehiclePageText(
      'en',
      { value: 'AA1234BB', car: 'Toyota Camry', year: '2015', extra: ['Petrol'] },
      'plate'
    )
    expect(t.title).toBe('Cars UA - AA1234BB - Toyota Camry 2015')
    expect(t.description).toContain('Toyota Camry, 2015, Petrol')
  })
})

describe('renderMetaTags with a non-card image', () => {
  it('states the image type and omits the card dimensions', () => {
    const html = renderMetaTags({
      siteUrl: 'https://carsua.app',
      path: '/AA1234BB',
      lang: 'en',
      title: 't',
      description: 'd',
      image: 'https://carsua.app/api/shares/x/image',
      imageType: 'image/jpeg'
    })
    expect(html).toContain('og:image:type" content="image/jpeg"')
    expect(html).not.toContain('og:image:width')
    expect(html).not.toContain('og:image:height')
  })

  it('sends the stored size of a shared photo when it is known', () => {
    const html = renderMetaTags({
      siteUrl: 'https://carsua.app',
      path: '/AA1234BB',
      lang: 'en',
      title: 't',
      description: 'd',
      image: 'https://carsua.app/api/shares/x/image',
      imageType: 'image/jpeg',
      imageSize: { width: 1600, height: 900 }
    })
    expect(html).toContain('og:image:width" content="1600"')
    expect(html).toContain('og:image:height" content="900"')
  })
})
