import { BadGatewayException, BadRequestException, ServiceUnavailableException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PhotosService } from './photos.service.js'

vi.stubEnv('PIXABAY_API_KEY', 'test-key')

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('PhotosService', () => {
  it('queries Pixabay by brand/model/year and maps hits to VehiclePhoto', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(
      jsonResponse({
        hits: [
          {
            id: 1,
            pageURL: 'https://pixabay.com/photos/1',
            tags: 'kia, ceed, car',
            previewURL: 'https://cdn.pixabay.com/1_150.jpg',
            webformatURL: 'https://cdn.pixabay.com/1_640.jpg',
            user: 'someone'
          }
        ]
      })
    )

    const service = new PhotosService()
    const result = await service.search('Kia', 'Ceed', 2012)

    expect(result).toEqual({
      query: 'Kia Ceed 2012',
      images: [
        {
          id: 1,
          previewURL: 'https://cdn.pixabay.com/1_150.jpg',
          webformatURL: 'https://cdn.pixabay.com/1_640.jpg',
          pageURL: 'https://pixabay.com/photos/1',
          tags: 'kia, ceed, car',
          user: 'someone'
        }
      ]
    })
    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('q=Kia+Ceed+2012')
    expect(String(url)).toContain('key=test-key')
  })

  it('caches by query and does not call fetch twice', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(jsonResponse({ hits: [] }))
    const service = new PhotosService()

    await service.search('Kia', 'Ceed')
    await service.search('Kia', 'Ceed')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws BadRequestException when brand and model are both empty', async () => {
    const service = new PhotosService()
    await expect(service.search('', '')).rejects.toBeInstanceOf(BadRequestException)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('throws BadGatewayException on a non-ok upstream response', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, 500))
    const service = new PhotosService()
    await expect(service.search('Kia', 'Ceed')).rejects.toBeInstanceOf(BadGatewayException)
  })

  it('maps a 429 to ServiceUnavailableException', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, 429))
    const service = new PhotosService()
    await expect(service.search('Kia', 'Ceed')).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
