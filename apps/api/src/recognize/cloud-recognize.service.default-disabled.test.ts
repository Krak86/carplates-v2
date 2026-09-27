import { ServiceUnavailableException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

import { CloudRecognizeService } from './cloud-recognize.service.js'

vi.stubEnv('PLATE_RECOGNIZER_CLOUD_TOKEN', 'test-token')

const image = { buffer: Buffer.from('fake-image-bytes'), mimetype: 'image/jpeg', filename: 'plate.jpg' }

describe('CloudRecognizeService without PLATE_RECOGNIZER_CLOUD_ENABLED set', () => {
  it('throws ServiceUnavailableException even though a token is configured', async () => {
    const service = new CloudRecognizeService()
    await expect(service.recognize(image)).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
