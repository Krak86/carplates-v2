import { ServiceUnavailableException } from '@nestjs/common'
import type { PlateCandidate } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import { LocalRecognizeService } from './local-recognize.service.js'
import type { RegistryRankService } from './registry-rank.service.js'

const passThroughRank = { rank: async (c: PlateCandidate[]) => c } as unknown as RegistryRankService

const image = { buffer: Buffer.from('fake-image-bytes'), mimetype: 'image/jpeg', filename: 'plate.jpg' }

describe('LocalRecognizeService without ALPR_LOCAL_URL', () => {
  it('throws ServiceUnavailableException when ALPR_LOCAL_URL is unset', async () => {
    const service = new LocalRecognizeService(passThroughRank)
    await expect(service.recognize(image)).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
