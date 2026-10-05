import type { Model360 } from '@carplates/shared'

const SITE_LANG: Readonly<Record<string, string>> = { ua: 'uk', ru: 'ru', en: 'en' }

/** carshow360.net's language prefix for our UI language (ours is `ua`, theirs `uk`). */
export const siteLang = (lang: string): string => SITE_LANG[lang.slice(0, 2)] ?? 'en'

const pagePath = (m: Model360, lang: string): string =>
  `https://carshow360.net/${siteLang(lang)}/${m.brandSlug}/${m.modelSlug}/${m.slug}-${m.id}`

/** The embeddable viewer; `interior` opens it on the cabin view. */
export const model360EmbedUrl = (m: Model360, lang: string, interior: boolean): string =>
  `${pagePath(m, lang)}?${interior ? 'interior=&' : ''}iframe`

/** The gallery's own page on carshow360.net (attribution link). */
export const model360PageUrl = (m: Model360, lang: string): string => pagePath(m, lang)
