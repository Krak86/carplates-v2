import { describe, it, expect } from 'vitest'
// eslint-disable-next-line import-x/default -- CJS `export =` typings; esModuleInterop makes the default real
import iconv from 'iconv-lite'

import { decodeFeed, hasCategory, matchesUrl, newsSourcesSchema, parseFeed, plainSummary } from './news-parse.js'

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel>
<item>
  <title><![CDATA[Toyota &amp; Co: новинка]]></title>
  <link>https://example.com/a</link>
  <description><![CDATA[<p>Опис <b>статті</b></p><img src="https://example.com/i.jpg">]]></description>
  <pubDate>Mon, 05 Oct 2026 10:00:00 +0300</pubDate>
  <category>Toyota</category><category>china</category>
</item>
<item>
  <title>With enclosure</title>
  <link>https://example.com/b</link>
  <enclosure url="https://example.com/e.png" type="image/png"/>
</item>
<item><title>No link</title></item>
<item><link>https://example.com/c</link></item>
</channel></rss>`

describe('parseFeed', () => {
  const items = parseFeed(RSS)

  it('keeps only items with a title and a link', () => {
    expect(items.map(i => i.url)).toEqual(['https://example.com/a', 'https://example.com/b'])
  })

  it('reads title, plain summary, date, categories and the description image', () => {
    expect(items[0]).toMatchObject({
      title: 'Toyota & Co: новинка',
      summary: 'Опис статті',
      imageUrl: 'https://example.com/i.jpg',
      categories: ['Toyota', 'china']
    })
    expect(items[0]!.publishedAt?.toISOString()).toBe('2026-10-05T07:00:00.000Z')
  })

  it('prefers an <enclosure> image and tolerates a missing date', () => {
    expect(items[1]).toMatchObject({ imageUrl: 'https://example.com/e.png', publishedAt: null, summary: null })
  })
})

describe('plainSummary', () => {
  it('caps at 300 chars on a word boundary', () => {
    const out = plainSummary(`<p>${'слово '.repeat(100)}</p>`)!
    expect(out.length).toBeLessThanOrEqual(301)
    expect(out.endsWith('…')).toBe(true)
  })
})

describe('decodeFeed', () => {
  it('uses the XML declaration encoding (windows-1251)', () => {
    const bytes = iconv.encode('<?xml version="1.0" encoding="windows-1251"?><t>Новини</t>', 'windows-1251')
    expect(decodeFeed(bytes)).toContain('Новини')
  })
})

describe('newsSourcesSchema', () => {
  it('defaults enabled to true and rejects a bad url', () => {
    expect(newsSourcesSchema.parse([{ id: 'x', name: 'X', url: 'https://x.test/rss', lang: 'uk' }])[0]!.enabled).toBe(
      true
    )
    expect(() => newsSourcesSchema.parse([{ id: 'x', name: 'X', url: 'nope', lang: 'uk' }])).toThrow()
  })
})

describe('hasCategory', () => {
  it('matches a category exactly, ignoring case', () => {
    expect(hasCategory({ categories: ['Новини', 'авто'] }, ['Авто', 'Електромобілі'])).toBe(true)
    expect(hasCategory({ categories: ['Автоматизація'] }, ['Авто'])).toBe(false)
    expect(hasCategory({ categories: [] }, ['Авто'])).toBe(false)
  })
})

describe('matchesUrl', () => {
  it('matches any pattern, case-insensitively', () => {
    expect(matchesUrl({ url: 'https://x.com/Photos/a1/' }, ['/photos/'])).toBe(true)
    expect(matchesUrl({ url: 'https://x.com/news/a1/' }, ['/photos/', '/auto-loans/'])).toBe(false)
  })
})
