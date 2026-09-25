import { ServiceUnavailableException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

import { CloudRecognizeService } from './cloud-recognize.service.js'

vi.stubEnv('PLATE_RECOGNIZER_CLOUD_TOKEN', 'test-token')
vi.stubEnv('PLATE_RECOGNIZER_MONTHLY_BUDGET', '1')
vi.stubGlobal(
  'fetch',
  vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ results: [{ plate: 'AA1234BC', score: 0.9 }] }), { status: 200 }))
)

const image = { buffer: Buffer.from('fake-image-bytes'), mimetype: 'image/jpeg', filename: 'plate.jpg' }

describe('CloudRecognizeService budget', () => {
  it('exhausts the monthly budget after PLATE_RECOGNIZER_MONTHLY_BUDGET calls', async () => {
    const service = new CloudRecognizeService()
    await expect(service.recognize(image)).resolves.toBeDefined()
    await expect(service.recognize(image)).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
