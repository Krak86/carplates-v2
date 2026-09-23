import { ServiceUnavailableException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

import { PhotosService } from './photos.service.js'

describe('PhotosService without an API key', () => {
  it('throws ServiceUnavailableException when PIXABAY_API_KEY is unset', async () => {
    const service = new PhotosService()
    await expect(service.search('Kia', 'Ceed')).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
