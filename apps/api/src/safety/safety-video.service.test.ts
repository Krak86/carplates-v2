import { BadRequestException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SafetyVideoService } from './safety-video.service.js'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('SafetyVideoService', () => {
  it('rejects a URL that is not an NHTSA crash-test video, without calling fetch', async () => {
    const service = new SafetyVideoService()
    await expect(service.transcode('https://evil.example.com/payload.wmv')).rejects.toBeInstanceOf(BadRequestException)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects a static.nhtsa.gov URL outside the crash-test video path shape', async () => {
    const service = new SafetyVideoService()
    await expect(service.transcode('https://static.nhtsa.gov/other/secrets.txt')).rejects.toBeInstanceOf(
      BadRequestException
    )
    expect(fetch).not.toHaveBeenCalled()
  })
})
