import { BadGatewayException, BadRequestException, NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocalRecognizeService } from './local-recognize.service.js'

vi.stubEnv('ALPR_LOCAL_URL', 'http://localhost:8088')

const image = { buffer: Buffer.from('fake-image-bytes'), mimetype: 'image/jpeg', filename: 'plate.jpg' }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('LocalRecognizeService', () => {
  it('normalizes and repairs the top result, posting to the configured ALPR container', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(jsonResponse({ results: [{ plate: 'BH01791C', score: 0.92 }] }))

    const service = new LocalRecognizeService()
    const result = await service.recognize(image)

    expect(result).toEqual({ candidates: [{ plate: 'ВН0179ІС', raw: 'BH01791C', score: 0.92 }] })
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('http://localhost:8088/recognize')
    const form = init?.body as FormData
    expect(form.get('image')).toBeInstanceOf(Blob)
  })

  it('throws NotFoundException when the container returns no results', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ results: [] }))
    const service = new LocalRecognizeService()
    await expect(service.recognize(image)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('throws BadGatewayException on a non-ok upstream response', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, 500))
    const service = new LocalRecognizeService()
    await expect(service.recognize(image)).rejects.toBeInstanceOf(BadGatewayException)
  })

  it('throws BadGatewayException when the fetch itself rejects (container not running)', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('connect ECONNREFUSED'))
    const service = new LocalRecognizeService()
    await expect(service.recognize(image)).rejects.toBeInstanceOf(BadGatewayException)
  })

  it('rejects an unsupported mimetype before calling upstream', async () => {
    const service = new LocalRecognizeService()
    await expect(service.recognize({ ...image, mimetype: 'image/heic' })).rejects.toBeInstanceOf(BadRequestException)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects an empty buffer before calling upstream', async () => {
    const service = new LocalRecognizeService()
    await expect(service.recognize({ ...image, buffer: Buffer.alloc(0) })).rejects.toBeInstanceOf(BadRequestException)
    expect(fetch).not.toHaveBeenCalled()
  })
})
