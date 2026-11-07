import { brandPronunciationSchema } from '@carplates/shared'
import { describe, expect, it, vi } from 'vitest'

import type { DbService } from '../db/db.service.js'

import { BrandsService } from './brands.service.js'

/** `select().from(table).where()` answers the pronunciation rows first, then the audio rows (Promise.all order). */
function setup(rows: unknown[], audio: unknown[] = []) {
  const results = [rows, audio]
  const select = vi.fn().mockImplementation(() => ({
    from: () => ({ where: () => Promise.resolve(results.shift() ?? []) })
  }))
  return new BrandsService({ db: { select } } as unknown as DbService)
}

const row = (lang: string, respell: string | null, ipa: string | null = null) => ({
  brandSlug: 'skoda',
  lang,
  ipa,
  ipaLang: ipa ? 'cs' : null,
  respell,
  source: 'override',
  rev: null
})

describe('BrandsService.pronunciation', () => {
  it('orders the rows ua, ru, en, drops unknown languages and stays schema-valid', async () => {
    const res = await setup([
      row('en', null, 'ˈʃkoda'),
      row('de', 'x'),
      row('ru', 'Шкода'),
      row('ua', 'Шкода')
    ]).pronunciation('skoda')
    expect(brandPronunciationSchema.safeParse(res).error?.issues).toBeUndefined()
    expect(res?.items.map(i => i.lang)).toEqual(['ua', 'ru', 'en'])
    expect(res?.audio).toBeNull()
  })

  it('returns null for a make with no rows', async () => {
    expect(await setup([]).pronunciation('nope')).toBeNull()
  })

  it('attaches the audio clip with its credit', async () => {
    const clip = {
      brandSlug: 'skoda',
      lang: 'cs',
      url: 'https://x/y.ogg',
      author: 'A',
      license: 'CC BY-SA 3.0',
      kind: 'commons'
    }
    const res = await setup([row('ua', 'Шкода')], [clip]).pronunciation('skoda')
    expect(res?.audio).toEqual({
      lang: 'cs',
      url: 'https://x/y.ogg',
      author: 'A',
      license: 'CC BY-SA 3.0',
      kind: 'commons'
    })
  })
})
