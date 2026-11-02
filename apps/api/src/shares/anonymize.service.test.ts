import { BadGatewayException, PayloadTooLargeException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AnonymizeService } from './anonymize.service.js'

vi.stubEnv('ALPR_LOCAL_URL', 'http://alpr:8088')
vi.stubEnv('ALPR_API_KEY', 'alpr-secret')

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('AnonymizeService', () => {
  it('posts the original bytes to /anonymize with the shared key and returns the blurred JPEG', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(Buffer.from('blurred'), { status: 200, headers: { 'x-faces-blurred': '2' } })
    )
    const out = await new AnonymizeService().anonymize(Buffer.from('original'), 'image/jpeg')

    expect(out.image.toString()).toBe('blurred')
    expect(out.faces).toBe(2)
    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? []
    expect(url).toBe('http://alpr:8088/anonymize')
    expect((init?.headers as Record<string, string>)['x-alpr-key']).toBe('alpr-secret')
    const sent = (init?.body as FormData).get('image') as Blob
    expect(Buffer.from(await sent.arrayBuffer()).toString()).toBe('original')
  })

  it('maps container failures to 502 and an oversized image to 413', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 502 }))
    await expect(new AnonymizeService().anonymize(Buffer.from('x'), 'image/jpeg')).rejects.toBeInstanceOf(
      BadGatewayException
    )
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 413 }))
    await expect(new AnonymizeService().anonymize(Buffer.from('x'), 'image/jpeg')).rejects.toBeInstanceOf(
      PayloadTooLargeException
    )
    vi.mocked(fetch).mockRejectedValueOnce(new Error('connect refused'))
    await expect(new AnonymizeService().anonymize(Buffer.from('x'), 'image/jpeg')).rejects.toBeInstanceOf(
      BadGatewayException
    )
  })
})
