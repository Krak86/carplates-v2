import { Inject, Injectable } from '@nestjs/common'
import { brandPronunciation, brandPronunciationAudio } from '@carplates/db'
import { BRAND_PRONUNCIATION_LANGS } from '@carplates/shared'
import type { BrandPronunciation, BrandPronunciationLang } from '@carplates/shared'
import { eq } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

const isLang = (v: string): v is BrandPronunciationLang => (BRAND_PRONUNCIATION_LANGS as readonly string[]).includes(v)

@Injectable()
export class BrandsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** The ua / ru / en rows of one make (in that order) plus its audio clip, or null when the make has none. */
  async pronunciation(slug: string): Promise<BrandPronunciation | null> {
    const { db } = this.dbService
    const [rows, audio] = await Promise.all([
      db.select().from(brandPronunciation).where(eq(brandPronunciation.brandSlug, slug)),
      db.select().from(brandPronunciationAudio).where(eq(brandPronunciationAudio.brandSlug, slug))
    ])
    const items = rows
      .flatMap(r => (isLang(r.lang) ? [{ lang: r.lang, ipa: r.ipa, ipaLang: r.ipaLang, respell: r.respell }] : []))
      .sort((a, b) => BRAND_PRONUNCIATION_LANGS.indexOf(a.lang) - BRAND_PRONUNCIATION_LANGS.indexOf(b.lang))
    if (!items.length) return null
    const clip = audio[0]
    return {
      slug,
      items,
      audio:
        clip && (clip.kind === 'commons' || clip.kind === 'tts')
          ? { lang: clip.lang, url: clip.url, author: clip.author, license: clip.license, kind: clip.kind }
          : null
    }
  }
}
