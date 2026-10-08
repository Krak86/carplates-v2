import type { Model360, Winner360 } from '@carplates/shared'

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

const WINNER_ORIGIN = 'https://stock.winner.ua'

/** Winner Imports' own interior viewer page for one stock panorama (embeddable, and the attribution link). */
export const winner360Url = (w: Winner360): string => `${WINNER_ORIGIN}/360.php?photo_recid=${w.photoRecid}`

/** "2026 · XC60 B5 Core MY27" — the chip text of an alternative interior (whatever of year/version is known). */
export const winner360ChipLabel = (w: Winner360): string =>
  [w.year, w.version].filter(Boolean).join(' · ') || String(w.photoRecid)

const EXTERIOR_SUFFIX = '-ext'
const WINNER_PREFIX = 'w'

/** Share-link `tab` value: `<id>` opens the cabin view (the default), `<id>-ext` the exterior, `w<photoRecid>` an alternative interior. */
export const model360ShareTab = (id: number, interior: boolean): string => `${id}${interior ? '' : EXTERIOR_SUFFIX}`

export const winner360ShareTab = (photoRecid: number): string => `${WINNER_PREFIX}${photoRecid}`

/** Inverse of the share-tab builders; an unparsable tab gives null ids. */
export const parseModel360Tab = (
  tab: string | null
): { id: number | null; interior: boolean; winnerId: number | null } => {
  const raw = tab ?? ''
  if (raw.startsWith(WINNER_PREFIX)) {
    const winnerId = Number.parseInt(raw.slice(WINNER_PREFIX.length), 10)
    return { id: null, interior: true, winnerId: Number.isFinite(winnerId) ? winnerId : null }
  }
  const id = Number.parseInt(raw, 10)
  return { id: Number.isFinite(id) ? id : null, interior: !raw.endsWith(EXTERIOR_SUFFIX), winnerId: null }
}
