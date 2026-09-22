import { ServiceUnavailableException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

import { CloudRecognizeService } from './cloud-recognize.service.js'

const image = { buffer: Buffer.from('fake-image-bytes'), mimetype: 'image/jpeg', filename: 'plate.jpg' }

describe('CloudRecognizeService without a token', () => {
  it('throws ServiceUnavailableException when PLATE_RECOGNIZER_CLOUD_TOKEN is unset', async () => {
    const service = new CloudRecognizeService()
    await expect(service.recognize(image)).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
