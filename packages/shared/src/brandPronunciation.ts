import { z } from 'zod'

import { catalogSlugSchema } from './catalog.js'

/** Site languages of a pronunciation row (`registry.brand_pronunciation.lang`). */
export const BRAND_PRONUNCIATION_LANGS = ['ua', 'ru', 'en'] as const
export type BrandPronunciationLang = (typeof BRAND_PRONUNCIATION_LANGS)[number]

/** One language of a make: how the name is said (IPA) and written in that language's script (respelling, stress as U+0301). */
export const brandPronunciationItemSchema = z.object({
  lang: z.enum(BRAND_PRONUNCIATION_LANGS),
  /** IPA without brackets. */
  ipa: z.string().nullable(),
  /** Language the IPA is for: `en` = English reading, otherwise the native one (`de`, `fr`, `ja` ...). */
  ipaLang: z.string().nullable(),
  respell: z.string().nullable()
})
export type BrandPronunciationItem = z.infer<typeof brandPronunciationItemSchema>

/** Origin-language clip (Commons file, or generated); author + licence are shown as the credit. */
export const brandPronunciationAudioSchema = z.object({
  lang: z.string(),
  url: z.string(),
  author: z.string().nullable(),
  license: z.string().nullable(),
  kind: z.enum(['commons', 'tts'])
})
export type BrandPronunciationAudio = z.infer<typeof brandPronunciationAudioSchema>

/** `GET /api/brands/:slug/pronunciation`. */
export const brandPronunciationSchema = z.object({
  slug: z.string(),
  items: z.array(brandPronunciationItemSchema),
  audio: brandPronunciationAudioSchema.nullable().optional()
})
export type BrandPronunciation = z.infer<typeof brandPronunciationSchema>

export const brandPronunciationParamsSchema = z.object({ slug: catalogSlugSchema })
export type BrandPronunciationParams = z.infer<typeof brandPronunciationParamsSchema>

/** `GET` path of a make's pronunciation. */
export const brandPronunciationPath = (slug: string): string => `/api/brands/${slug}/pronunciation`
