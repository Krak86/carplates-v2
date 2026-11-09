import type { WikiCandidateInfo } from '@carplates/db'
import { describe, expect, it, vi } from 'vitest'

import type { GenerationsService } from '../generations/generations.service.js'
import type { WikiCandidateStore } from './wiki-candidate.store.js'
import { WikiPhotosService } from './wiki-photos.service.js'

const row = (title: string, photoYear: number | null): WikiCandidateInfo => ({
  title,
  imageUrl: `https://upload.example/${title}.jpg`,
  imageWidth: 1280,
  imageHeight: 853,
  photoYear,
  attrAuthor: null,
  attrLicense: null,
  attrLicenseUrl: null,
  bucket: 'gray',
  lab: [60, 0, 0],
  quality: 10
})

const setup = (rows: WikiCandidateInfo[], generations: () => Promise<unknown>) => {
  const find = vi.fn().mockResolvedValue(rows)
  const service = new WikiPhotosService(
    { find } as unknown as WikiCandidateStore,
    { generations } as unknown as GenerationsService
  )
  return { service, find }
}

describe('WikiPhotosService', () => {
  it('looks the model up under the lower-cased key and answers an empty list for an unscanned model', async () => {
    const generations = vi.fn()
    const { service, find } = setup([], generations)
    expect(await service.lookup('  KIA ', 'Ceed', 2019, null)).toEqual({ photos: [] })
    expect(find).toHaveBeenCalledWith('kia', 'ceed')
    expect(generations).not.toHaveBeenCalled()
  })

  it('filters by the generation of the car year', async () => {
    const { service } = setup([row('old', 2008), row('new', 2019)], async () => ({
      match: { current: { yearFrom: 2018, yearTo: 2024 } }
    }))
    const { photos } = await service.lookup('kia', 'ceed', 2019, null)
    expect(photos.map(p => p.title)).toEqual(['new'])
  })

  it('keeps every photo when the generation lookup fails or no year is given', async () => {
    const { service } = setup([row('old', 2008), row('new', 2019)], async () => {
      throw new Error('db down')
    })
    expect((await service.lookup('kia', 'ceed', 2019, null)).photos).toHaveLength(2)
    expect((await service.lookup('kia', 'ceed', null, null)).photos).toHaveLength(2)
  })
})
