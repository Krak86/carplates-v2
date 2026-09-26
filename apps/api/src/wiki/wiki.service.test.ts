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
        original: { source: 'https://upload.wikimedia.org/wikipedia/commons/5/55/Toyota_Camry.jpg', width: 800, height: 600 }
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
  it('resolves a page, its image, and the image attribution', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse(searchPayload)).mockResolvedValueOnce(jsonResponse(imageInfoPayload))

    const service = new WikiService()
    const result = await service.lookup('Toyota', 'Camry', 'en')

    expect(result).toEqual({
      query: 'Toyota Camry',
      found: true,
      title: 'Toyota Camry',
      extract: 'Toyota Camry is a car.',
      pageUrl: 'https://en.wikipedia.org/wiki/Toyota_Camry',
      image: {
        url: 'https://upload.wikimedia.org/wikipedia/commons/5/55/Toyota_Camry.jpg',
        width: 800,
        height: 600,
        attribution: {
          author: 'Someone',
          license: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0'
        }
      }
    })

    const [searchUrl, searchInit] = fetchMock.mock.calls[0] ?? []
    expect(String(searchUrl)).toContain('en.wikipedia.org')
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

    expect(result).toEqual({ query: 'Asdfgh Qwerty', found: false, title: null, extract: null, pageUrl: null, image: null })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('still returns the page and image, with null attribution, when the Commons imageinfo call fails', async () => {
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
