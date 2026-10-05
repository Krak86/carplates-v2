import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { listingUrl, parseArticle, parseListing, yearHintOf } from './press-parse.js'

const page = (name: string): string =>
  readFileSync(join(import.meta.dirname, 'fixtures', 'press', `${name}.html`), 'utf8')

describe('listingUrl', () => {
  it('uses the bare tag for page 1 and each site’s own pagination after that', () => {
    expect(listingUrl('itc', 1)).toBe('https://itc.ua/ua/tag/test-drayv-ua/')
    expect(listingUrl('itc', 4)).toBe('https://itc.ua/ua/tag/test-drayv-ua/page/4/')
    expect(listingUrl('mezha', 1)).toBe('https://mezha.ua/tag/test-drayv/')
    expect(listingUrl('mezha', 8)).toBe('https://mezha.ua/tag/test-drayv/?page=8')
  })
})

describe('parseListing', () => {
  it('takes only the article cards of an itc.ua page', () => {
    const urls = parseListing(page('itc-listing'), 'itc')
    expect(urls).toHaveLength(3)
    expect(urls.every(u => u.startsWith('https://itc.ua/ua/articles/test-'))).toBe(true)
  })

  it('takes the article cards of a mezha.ua page', () => {
    const urls = parseListing(page('mezha-listing'), 'mezha')
    expect(urls).toHaveLength(3)
    expect(urls.every(u => u.startsWith('https://mezha.ua/'))).toBe(true)
  })
})

describe('parseArticle', () => {
  it('reads an itc.ua article with its ru alternate and tags', () => {
    expect(parseArticle(page('itc-article-uk'))).toEqual({
      url: 'https://itc.ua/ua/articles/test-drajv-honda-cr-v-e-hev-4wd-dosvid-ne-progulyayesh/',
      title: 'Тест-драйв Honda CR-V e:HEV AWD: досвід не прогуляєш',
      blurb: expect.stringContaining('новий кросовер Honda CR-V'),
      publishedAt: '2022-10-13',
      keywords: 'Honda, Авто, Тест-драйв',
      alternates: {
        uk: 'https://itc.ua/ua/articles/test-drajv-honda-cr-v-e-hev-4wd-dosvid-ne-progulyayesh/',
        ru: 'https://itc.ua/articles/test-drajv-honda-cr-v-e-hev-4wd-opytnyj-kon/'
      }
    })
  })

  it('reads a mezha.ua article: keywords meta, JSON-LD date and an en alternate', () => {
    expect(parseArticle(page('mezha-article-uk'))).toMatchObject({
      url: 'https://mezha.ua/articles/test-drayv-mazda6-turbo/',
      title: 'Тест-драйв автомобіля Mazda6: яскраво-сірий «турбо»',
      publishedAt: '2022-07-02',
      keywords: 'Mazda6',
      alternates: {
        uk: 'https://mezha.ua/articles/test-drayv-mazda6-turbo/',
        en: 'https://mezha.ua/en/articles/mazda6-test-drive-bright-gray-turbo/'
      }
    })
  })

  it('returns null for a page that is not an article', () => {
    expect(parseArticle('<html><head></head></html>')).toBeNull()
  })
})

describe('yearHintOf', () => {
  it('finds a model year in a title, ignoring prices and decimals', () => {
    expect(yearHintOf(['Nissan X-Trail 2026: мінус мотор'])).toBe(2026)
    expect(yearHintOf(['Duster 1.3 TCe 150 за 38 000'])).toBeNull()
  })
})
