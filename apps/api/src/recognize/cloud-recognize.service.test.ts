import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException
} from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CloudRecognizeService } from './cloud-recognize.service.js'

vi.stubEnv('PLATE_RECOGNIZER_CLOUD_TOKEN', 'test-token')

const image = { buffer: Buffer.from('fake-image-bytes'), mimetype: 'image/jpeg', filename: 'plate.jpg' }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('CloudRecognizeService', () => {
  it('normalizes and repairs the top result, sending the token and "upload" field', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(jsonResponse({ results: [{ plate: 'BH01791C', score: 0.92 }] }))

    const service = new CloudRecognizeService()
    const result = await service.recognize(image)

    expect(result).toEqual({ candidates: [{ plate: 'ВН0179ІС', raw: 'BH01791C', score: 0.92 }] })
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('https://api.platerecognizer.com/v1/plate-reader/')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Token test-token')
    const form = init?.body as FormData
    expect(form.get('upload')).toBeInstanceOf(Blob)
  })

  it('throws NotFoundException when the upstream returns no results', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ results: [] }))
    const service = new CloudRecognizeService()
    await expect(service.recognize(image)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('throws BadGatewayException on a non-ok, non-auth upstream response', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, 500))
    const service = new CloudRecognizeService()
    await expect(service.recognize(image)).rejects.toBeInstanceOf(BadGatewayException)
  })

  it('throws BadGatewayException when the fetch itself rejects', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))
    const service = new CloudRecognizeService()
    await expect(service.recognize(image)).rejects.toBeInstanceOf(BadGatewayException)
  })

  it('maps a 403 to ServiceUnavailableException instead of BadGatewayException', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, 403))
    const service = new CloudRecognizeService()
    await expect(service.recognize(image)).rejects.toBeInstanceOf(ServiceUnavailableException)
  })

  it('maps a 429 to ServiceUnavailableException', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, 429))
    const service = new CloudRecognizeService()
    await expect(service.recognize(image)).rejects.toBeInstanceOf(ServiceUnavailableException)
  })

  it('rejects an unsupported mimetype before calling upstream', async () => {
    const service = new CloudRecognizeService()
    await expect(service.recognize({ ...image, mimetype: 'image/heic' })).rejects.toBeInstanceOf(BadRequestException)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects an empty buffer before calling upstream', async () => {
    const service = new CloudRecognizeService()
    await expect(service.recognize({ ...image, buffer: Buffer.alloc(0) })).rejects.toBeInstanceOf(BadRequestException)
    expect(fetch).not.toHaveBeenCalled()
  })
})
