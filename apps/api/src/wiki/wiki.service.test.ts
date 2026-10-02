import { BadGatewayException, BadRequestException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WikiService } from './wiki.service.js'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

const searchPayload = {
  query: {
    pages: {
      '425391': {
        pageid: 425391,
        title: 'Toyota Camry',
        extract: 'Toyota Camry is a car.',
        original: {
          source: 'https://upload.wikimedia.org/wikipedia/commons/5/55/Toyota_Camry.jpg',
          width: 800,
          height: 600
        }
      }
    }
  }
}

const THUMB_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Toyota_Camry.jpg/1280px-Toyota_Camry.jpg'

const searchPayloadWithThumb = {
  query: {
    pages: {
      '425391': {
        ...searchPayload.query.pages['425391'],
        original: {
          source: 'https://upload.wikimedia.org/wikipedia/commons/5/55/Toyota_Camry.jpg',
          width: 4000,
          height: 3000
        },
        thumbnail: { source: THUMB_URL, width: 1280, height: 960 }
      }
    }
  }
}

const imageInfoPayload = {
  query: {
    pages: {
      '123': {
        imageinfo: [
          {
            extmetadata: {
              Artist: { value: 'Someone' },
              LicenseShortName: { value: 'CC BY-SA 4.0' },
              LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' }
            }
          }
        ]
      }
    }
  }
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('WikiService', () => {
  it('resolves a page, its thumbnail image, and the original image attribution', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(jsonResponse(searchPayloadWithThumb))
      .mockResolvedValueOnce(jsonResponse(imageInfoPayload))

    const service = new WikiService()
    const result = await service.lookup('Toyota', 'Camry', 'en')

    expect(result).toEqual({
      query: 'Toyota Camry',
      found: true,
      title: 'Toyota Camry',
      extract: 'Toyota Camry is a car.',
      pageUrl: 'https://en.wikipedia.org/wiki/Toyota_Camry',
      image: {
        url: THUMB_URL,
        width: 1280,
        height: 960,
        attribution: {
          author: 'Someone',
          license: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0'
        }
      }
    })

    const [searchUrl, searchInit] = fetchMock.mock.calls[0] ?? []
    expect(String(searchUrl)).toContain('en.wikipedia.org')
    expect(String(searchUrl)).toContain('pithumbsize=1280')
    expect((searchInit as RequestInit).headers).toMatchObject({ 'user-agent': expect.stringContaining('carsua-app') })

    const [imageInfoUrl] = fetchMock.mock.calls[1] ?? []
    expect(String(imageInfoUrl)).toContain('titles=File%3AToyota_Camry.jpg')
  })

  it('maps a UA language code to the uk.wikipedia.org domain', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse({ query: { pages: {} } }))

    const service = new WikiService()
    await service.lookup('Toyota', 'Camry', 'ua')

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('uk.wikipedia.org')
  })

  it('caches by domain + query and does not call fetch twice', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(jsonResponse({ query: { pages: {} } }))
    const service = new WikiService()

    await service.lookup('Toyota', 'Camry', 'en')
    await service.lookup('Toyota', 'Camry', 'en')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns found: false, without calling the image API, when the search has no results', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse({ query: { pages: {} } }))

    const service = new WikiService()
    const result = await service.lookup('Asdfgh', 'Qwerty', 'en')

    expect(result).toEqual({
      query: 'Asdfgh Qwerty',
      found: false,
      title: null,
      extract: null,
      pageUrl: null,
      image: null
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to the original image, with null attribution, when there is no thumbnail and Commons fails', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse(searchPayload)).mockResolvedValueOnce(jsonResponse({}, 500))

    const service = new WikiService()
    const result = await service.lookup('Toyota', 'Camry', 'en')

    expect(result.found).toBe(true)
    expect(result.image).toEqual({
      url: 'https://upload.wikimedia.org/wikipedia/commons/5/55/Toyota_Camry.jpg',
      width: 800,
      height: 600,
      attribution: null
    })
  })

  it('uses a year-matched Commons photo when a year is given, falling back to the lead image otherwise', async () => {
    const fetchMock = vi.mocked(fetch)
    const commonsPayload = (title: string) => ({
      query: {
        pages: {
          '1': {
            index: 1,
            title,
            imageinfo: [
              {
                thumburl: 'https://upload.wikimedia.org/thumb/crv2008.jpg',
                thumbwidth: 1280,
                thumbheight: 853,
                width: 3000,
                height: 2000,
                mime: 'image/jpeg',
                extmetadata: { Artist: { value: '<a>Jane</a>' }, LicenseShortName: { value: 'CC BY 2.0' } }
              }
            ]
          }
        }
      }
    })
    fetchMock.mockImplementation(async input => {
      const url = String(input)
      if (url.includes('commons.wikimedia.org')) return jsonResponse(commonsPayload('File:2008 Toyota Camry EX.jpg'))
      return jsonResponse(searchPayloadWithThumb)
    })

    const service = new WikiService()
    const withYear = await service.lookup('Toyota', 'Camry', 'en', { year: 2008, source: 'commons' })
    expect(withYear.image).toEqual({
      url: 'https://upload.wikimedia.org/thumb/crv2008.jpg',
      width: 1280,
      height: 853,
      attribution: { author: 'Jane', license: 'CC BY 2.0', licenseUrl: null }
    })

    const leadOnly = await service.lookup('Toyota', 'Camry', 'en', { year: 2008, source: 'wiki' })
    expect(leadOnly.image?.url).toBe(THUMB_URL)
  })

  it('treats an article whose title lacks the model as not found', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        query: {
          pages: {
            '1': {
              title: 'Mike Schmitz',
              extract: 'A priest.',
              original: { source: 'https://x/y.jpg', width: 1, height: 1 }
            }
          }
        }
      })
    )

    const result = await new WikiService().lookup('SCHMITZ', 'S 01', 'en')
    expect(result).toMatchObject({ found: false, image: null, extract: null })
  })

  it('throws BadRequestException when brand and model are both empty', async () => {
    const service = new WikiService()
    await expect(service.lookup('', '', 'en')).rejects.toBeInstanceOf(BadRequestException)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('throws BadGatewayException when the search request itself fails', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, 500))
    const service = new WikiService()
    await expect(service.lookup('Toyota', 'Camry', 'en')).rejects.toBeInstanceOf(BadGatewayException)
  })
})
