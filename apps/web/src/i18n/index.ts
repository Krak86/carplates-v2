import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { CORE, PACK_NAMES } from './packs'
import type { PackName, SliceKind } from './packs'

export const LANGS = ['ua', 'ru', 'en'] as const
export type Lang = (typeof LANGS)[number]

type Dictionary = Record<string, string>

// One chunk per language AND slice (`packs.ts`): a visit only downloads the `core` slice of its language plus the packs of the
// routes it opens. `ua` is also the fallback for keys another language lacks (`en` lacks ~9%: vin.val.*, vin.var.*, some plural
// forms), but a visitor never needs the whole `ua` for that: `DELTAS` holds, per language and slice, only the `ua` keys it lacks
// (`<lang>.<slice>.delta.pack.json`, generated at build time from the source JSONs by `i18n-fallback-plugin.ts`). `ru` has every
// key, so it has no entry and downloads nothing extra (`fallback.test.ts` fails if a language gains a gap without an entry).
type Loader = () => Promise<{ default: Dictionary }>
const SLICES: Record<Lang, Record<SliceKind, Loader>> = {
  ua: {
    core: () => import('./ua.core.pack.json'),
    about: () => import('./ua.about.pack.json'),
    admin: () => import('./ua.admin.pack.json'),
    profile: () => import('./ua.profile.pack.json'),
    settings: () => import('./ua.settings.pack.json'),
    sitemap: () => import('./ua.sitemap.pack.json'),
    alternatives: () => import('./ua.alternatives.pack.json'),
    discuss: () => import('./ua.discuss.pack.json'),
    relax: () => import('./ua.relax.pack.json'),
    install: () => import('./ua.install.pack.json'),
    legal: () => import('./ua.legal.pack.json'),
    roadSafety: () => import('./ua.roadSafety.pack.json'),
    alarms: () => import('./ua.alarms.pack.json'),
    compare: () => import('./ua.compare.pack.json'),
    stats: () => import('./ua.stats.pack.json'),
    read: () => import('./ua.read.pack.json'),
    size: () => import('./ua.size.pack.json'),
    safety: () => import('./ua.safety.pack.json'),
    vin: () => import('./ua.vin.pack.json')
  },
  ru: {
    core: () => import('./ru.core.pack.json'),
    about: () => import('./ru.about.pack.json'),
    admin: () => import('./ru.admin.pack.json'),
    profile: () => import('./ru.profile.pack.json'),
    settings: () => import('./ru.settings.pack.json'),
    sitemap: () => import('./ru.sitemap.pack.json'),
    alternatives: () => import('./ru.alternatives.pack.json'),
    discuss: () => import('./ru.discuss.pack.json'),
    relax: () => import('./ru.relax.pack.json'),
    install: () => import('./ru.install.pack.json'),
    legal: () => import('./ru.legal.pack.json'),
    roadSafety: () => import('./ru.roadSafety.pack.json'),
    alarms: () => import('./ru.alarms.pack.json'),
    compare: () => import('./ru.compare.pack.json'),
    stats: () => import('./ru.stats.pack.json'),
    read: () => import('./ru.read.pack.json'),
    size: () => import('./ru.size.pack.json'),
    safety: () => import('./ru.safety.pack.json'),
    vin: () => import('./ru.vin.pack.json')
  },
  en: {
    core: () => import('./en.core.pack.json'),
    about: () => import('./en.about.pack.json'),
    admin: () => import('./en.admin.pack.json'),
    profile: () => import('./en.profile.pack.json'),
    settings: () => import('./en.settings.pack.json'),
    sitemap: () => import('./en.sitemap.pack.json'),
    alternatives: () => import('./en.alternatives.pack.json'),
    discuss: () => import('./en.discuss.pack.json'),
    relax: () => import('./en.relax.pack.json'),
    install: () => import('./en.install.pack.json'),
    legal: () => import('./en.legal.pack.json'),
    roadSafety: () => import('./en.roadSafety.pack.json'),
    alarms: () => import('./en.alarms.pack.json'),
    compare: () => import('./en.compare.pack.json'),
    stats: () => import('./en.stats.pack.json'),
    read: () => import('./en.read.pack.json'),
    size: () => import('./en.size.pack.json'),
    safety: () => import('./en.safety.pack.json'),
    vin: () => import('./en.vin.pack.json')
  }
}
const DELTAS: Partial<Record<Lang, Partial<Record<SliceKind, Loader>>>> = {
  en: {
    core: () => import('./en.core.delta.pack.json'),
    safety: () => import('./en.safety.delta.pack.json'),
    vin: () => import('./en.vin.delta.pack.json')
  }
}
const FALLBACK_LANG: Lang = 'ua'

const STORAGE_KEY = 'carplates.lang'

/** `?lang=` on a shared link wins for that visit; it is deliberately not persisted (see `setLang`). */
function langFromUrl(): Lang | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang')
    return fromUrl && (LANGS as readonly string[]).includes(fromUrl) ? (fromUrl as Lang) : null
  } catch {
    return null
  }
}

export function initialLang(): Lang {
  const fromUrl = langFromUrl()
  if (fromUrl) return fromUrl
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && (LANGS as readonly string[]).includes(saved)) return saved as Lang
  } catch {
    /* private mode / disabled storage */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'uk'
  if (nav === 'ru') return 'ru'
  if (nav === 'ua' || nav === 'uk') return 'ua'
  return 'en'
}

export function persistLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* ignore */
  }
}

void i18n.use(initReactI18next).init({
  resources: {},
  lng: initialLang(),
  fallbackLng: FALLBACK_LANG,
  interpolation: { escapeValue: false },
  // Resources arrive asynchronously; the app waits for `i18nReady` before its first render and for `loadLang` before a switch.
  // 'added': components re-render when the background fallback dictionary arrives (default is no re-render).
  react: { useSuspense: false, bindI18nStore: 'added' }
})

// Full slices registered, `${lang}:${slice}`, and delta slices, `${lang}:${slice}:delta`. Not `hasResourceBundle`: a delta is merged
// into the `ua` bundle, which then exists without being complete, and a later switch to `ua` must still fetch the real thing.
const loaded = new Set<string>()
// Packs a route asked for so far: a language switch loads them too, for the route that is still open.
const requestedPacks = new Set<PackName>()

async function loadSlice(lang: Lang, slice: SliceKind): Promise<void> {
  const id = `${lang}:${slice}`
  if (loaded.has(id)) return
  const dict = await SLICES[lang][slice]()
  i18n.addResourceBundle(lang, 'translation', dict.default, true, true)
  loaded.add(id)
}

/** The `ua` keys of `slice` that `lang` lacks (nothing for `ua`, `ru`, or a slice without gaps). */
async function loadDelta(lang: Lang, slice: SliceKind): Promise<void> {
  const load = DELTAS[lang]?.[slice]
  const id = `${lang}:${slice}:delta`
  if (!load || loaded.has(id)) return
  const delta = await load()
  // addResourceBundle merges without overwriting (`overwrite` false): a real `ua` slice that arrived meanwhile wins.
  i18n.addResourceBundle(FALLBACK_LANG, 'translation', delta.default, true, false)
  loaded.add(id)
}

/**
 * Registers the `core` slice (plus the packs routes already asked for) of `lang` with i18next. The keys it lacks come from
 * `ua`: only the language's delta (`DELTAS`, nothing for `ru`) is fetched, awaited unless `deferFallback`, in which case it
 * loads in the background once the page has loaded (a failed fetch is ignored: missing keys just show as keys).
 */
export async function loadLang(lang: Lang, deferFallback = false): Promise<void> {
  const packs = [...requestedPacks]
  await Promise.all([loadSlice(lang, CORE), ...packs.map(pack => loadSlice(lang, pack))])
  if (lang === FALLBACK_LANG) return
  const loadDeltas = (): Promise<unknown> =>
    Promise.all([CORE as SliceKind, ...packs].map(slice => loadDelta(lang, slice)))
  if (!deferFallback) {
    await loadDeltas()
    return
  }
  // After the window `load` event, so the delta does not compete with the first paint and the hero photo.
  const start = (): void => void loadDeltas().catch(() => undefined)
  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })
}

/** Loads route packs for the current language (and its `ua` delta); call before the route renders so no raw key shows. */
export async function loadPacks(packs: readonly PackName[]): Promise<void> {
  for (const pack of packs) requestedPacks.add(pack)
  const lang = i18n.language as Lang
  await Promise.all(packs.flatMap(pack => [loadSlice(lang, pack), loadDelta(lang, pack)]))
}

/** Resolves when the starting language is loaded - await it before the first render. Tests also get every pack. */
export const i18nReady = loadLang(initialLang(), true).then(() =>
  import.meta.env.MODE === 'test' ? loadPacks(PACK_NAMES) : undefined
)

export default i18n
