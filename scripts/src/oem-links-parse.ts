import type { OemLinkKind } from '@carplates/shared'

/** One official link: a make/model (our slugs, punctuation-free where the catalog's are), an optional trim, and where it goes. */
export type OemLink = {
  url: string
  makeSlug: string
  modelSlug: string
  variant: string
  kind: OemLinkKind
}

const link = (makeSlug: string, modelSlug: string, variant: string, kind: OemLinkKind, url: string): OemLink => ({
  url,
  makeSlug,
  modelSlug,
  variant,
  kind
})

/** Morgan's configurator is one page per model (read from its bundle; all answer 200). */
export const MORGAN_LINKS: readonly OemLink[] = [
  link('morgan', 'plus-four', '', 'configurator', 'https://configure.morgan-motor.com/plusfour/'),
  link('morgan', 'super-3', '', 'configurator', 'https://configure.morgan-motor.com/super-3/'),
  link('morgan', 'supersport', '', 'configurator', 'https://configure.morgan-motor.com/supersport/'),
  link('morgan', 'supersport', '400', 'configurator', 'https://configure.morgan-motor.com/supersport-400/')
]

/** Lucid has one configurator for every model, plus a page per model. */
export const LUCID_LINKS: readonly OemLink[] = [
  link('lucid', 'air', '', 'configurator', 'https://lucidmotors.com/configure'),
  link('lucid', 'air', '', 'model-page', 'https://lucidmotors.com/air'),
  link('lucid', 'gravity', '', 'configurator', 'https://lucidmotors.com/configure'),
  link('lucid', 'gravity', '', 'model-page', 'https://lucidmotors.com/gravity')
]

/** Koenigsegg has model pages only (no public configurator): the models its home page lists. */
export const KOENIGSEGG_LINKS: readonly OemLink[] = [
  'gemera',
  'jesko-absolut',
  'jesko-attack',
  'cc850',
  'sadairs-spear'
].map(slug => link('koenigsegg', slug, '', 'model-page', `https://www.koenigsegg.com/model/${slug}`))

/** Aston Martin model-page slug -> our model and trim. Only listed slugs are linked (an unknown name would be a guess). */
export const ASTON_MODELS: Readonly<Record<string, readonly [model: string, variant: string]>> = {
  db12: ['db12', ''],
  'db12-volante': ['db12', 'Volante'],
  'dbx-gt': ['dbx', 'GT'],
  'dbx-s': ['dbx', 'S'],
  dbx707: ['dbx', '707'],
  vanquish: ['vanquish', ''],
  'vanquish-volante': ['vanquish', 'Volante'],
  'vantage-coupe': ['vantage', 'Coupe'],
  'vantage-roadster': ['vantage', 'Roadster']
}

/** Pages read for Aston Martin: any model page carries the whole range menu ("Configure" tile per model). */
export const ASTON_SOURCE_URL = 'https://www.astonmartin.com/en-us/models/db12'

/**
 * Aston Martin menu tiles: `click_url":"en/models/<slug>" ... href="https://configurator.astonmartin.com/US/configuration/AM###"`.
 * The attribute is HTML-escaped (`&quot;`). A model-select URL (a picker, not a configuration) is skipped.
 */
export function parseAstonConfigurators(html: string): OemLink[] {
  const text = html.replaceAll('&quot;', '"')
  const found = new Map<string, OemLink>()
  for (const m of text.matchAll(
    /click_url":"en\/models\/([a-z0-9-]+)"[^>]*href="(https:\/\/configurator\.astonmartin\.com\/US\/configuration\/AM[0-9A-Z]+)"/g
  )) {
    const mapped = ASTON_MODELS[m[1]!]
    if (!mapped) continue
    found.set(m[2]!, link('aston-martin', mapped[0], mapped[1], 'configurator', m[2]!))
  }
  return [...found.values()]
}

/** Lamborghini model page (path after `/en-en/models/`) -> our model and trim. */
export const LAMBORGHINI_PAGES: readonly { path: string; model: string; variant: string }[] = [
  { path: 'urus/urus-se', model: 'urus', variant: 'SE' },
  { path: 'urus/urus-se-performante', model: 'urus', variant: 'SE Performante' },
  { path: 'revuelto-models/revuelto', model: 'revuelto', variant: '' },
  { path: 'temerario-models/temerario', model: 'temerario', variant: '' }
]

export const lamborghiniPageUrl = (path: string): string => `https://www.lamborghini.com/en-en/models/${path}`

/** A model page shows every model's configurator link in its menu; its own is the one repeated most. */
const OWN_LINK_MIN_COUNT = 3

/**
 * The configurator link of one Lamborghini model page: the most frequent `configurator/model/<id>/MBV-<n>-<year>` link, and only
 * when it is clearly the page's own (a page that never repeats one, such as Revuelto's, gets no configurator link).
 */
export function parseLamborghiniOwnConfigurator(html: string): string | null {
  const counts = new Map<string, number>()
  for (const m of html.matchAll(
    /https:\/\/configurator\.lamborghini\.com\/configurator\/model\/[0-9-]+\/MBV-[0-9]+-[0-9]+/g
  ))
    counts.set(m[0], (counts.get(m[0]) ?? 0) + 1)
  const [best] = [...counts].sort((a, b) => b[1] - a[1])
  return best && best[1] >= OWN_LINK_MIN_COUNT ? best[0] : null
}

/** Deduplicated by URL + model + trim, sorted for a stable seed file. */
export function dedupeLinks(links: readonly OemLink[]): OemLink[] {
  const byKey = new Map<string, OemLink>()
  for (const l of links) byKey.set(`${l.makeSlug}/${l.modelSlug}/${l.variant}/${l.url}`, l)
  return [...byKey.values()].sort(
    (a, b) =>
      a.makeSlug.localeCompare(b.makeSlug) ||
      a.modelSlug.localeCompare(b.modelSlug) ||
      a.variant.localeCompare(b.variant) ||
      a.url.localeCompare(b.url)
  )
}
