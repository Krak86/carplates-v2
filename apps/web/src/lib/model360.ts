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

const BARE_GENERATION = /^(?:i{1,3}|iv|vi{0,3}|ix|x{1,2})$/i

/** A gallery label that is only a roman numeral ("III") reads as a dummy — spell it out ("III generation"); others pass through. */
export const model360ChipLabel = (m: Model360, generation: (n: string) => string): string =>
  BARE_GENERATION.test(m.label.trim()) ? generation(m.label.trim().toUpperCase()) : m.label

const EXTERIOR_SUFFIX = '-ext'

/** Share-link `tab` value: `<id>` opens the cabin view (the default), `<id>-ext` the exterior. */
export const model360ShareTab = (id: number, interior: boolean): string => `${id}${interior ? '' : EXTERIOR_SUFFIX}`

/** Inverse of `model360ShareTab`; an unparsable tab gives a null id. */
export const parseModel360Tab = (tab: string | null): { id: number | null; interior: boolean } => {
  const raw = tab ?? ''
  const id = Number.parseInt(raw, 10)
  return { id: Number.isFinite(id) ? id : null, interior: !raw.endsWith(EXTERIOR_SUFFIX) }
}
