import { ServiceUnavailableException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

import { LocalRecognizeService } from './local-recognize.service.js'

const image = { buffer: Buffer.from('fake-image-bytes'), mimetype: 'image/jpeg', filename: 'plate.jpg' }

describe('LocalRecognizeService without ALPR_LOCAL_URL', () => {
  it('throws ServiceUnavailableException when ALPR_LOCAL_URL is unset', async () => {
    const service = new LocalRecognizeService()
    await expect(service.recognize(image)).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
