// Dictionary packs: the keys of the listed first segments (`about.*`) leave the always-loaded `core` slice and load with the
// route that owns them (`lazyWithPacks`). One source JSON per language stays the only source: the Vite plugin
// (`i18n-fallback-plugin.ts`) cuts it into `<lang>.core.json` (every key outside a pack) and `<lang>.<pack>.json` virtual modules.
// A prefix not listed here is core, so a missing entry costs bytes, never a raw key.
//
// `owners`: the only source files / folders (relative to `apps/web`) allowed to reference the prefix. `packs.test.ts` fails
// if anything else does, because that code would render the raw key until the pack happens to be loaded. Add a prefix here
// only when the test passes (`keep`: key prefixes that stay in core because a shared user needs them, e.g. a route title in
// `useDocumentTitle` or a nav label; the test ignores them); shared components/hooks/lib users keep it in core (or wait for a `LazySection` pack).

type PackDef = { prefixes: readonly string[]; owners: readonly string[]; keep?: readonly string[] }

export const PACKS = {
  about: { prefixes: ['about'], owners: ['src/routes/AboutRoute.tsx'] },
  admin: { prefixes: ['admin'], owners: ['src/routes/admin/'] },
  profile: { prefixes: ['profile'], owners: ['src/routes/profile/'] },
  settings: { prefixes: ['settings'], owners: ['src/routes/settings/'] },
  sitemap: { prefixes: ['sitemap'], owners: ['src/routes/sitemap/'] },
  alternatives: { prefixes: ['alt'], owners: ['src/routes/alternatives/'] },
  discuss: { prefixes: ['discuss'], owners: ['src/routes/DiscussRoute.tsx'] },
  relax: { prefixes: ['relax'], owners: ['src/routes/RelaxRoute.tsx'] },
  install: { prefixes: ['install'], owners: ['src/routes/install/'], keep: ['install.heading'] },
  legal: {
    prefixes: ['legal'],
    owners: ['src/routes/LegalRoute.tsx', 'src/routes/legal/'],
    keep: ['legal.privacy.heading', 'legal.terms.heading']
  },
  roadSafety: {
    prefixes: ['roadSafety'],
    owners: ['src/routes/road-safety/', 'src/routes/alarms/', 'src/routes/read/safety/']
  },
  alarms: {
    prefixes: ['alarms'],
    owners: ['src/routes/alarms/'],
    keep: ['alarms.noData', 'alarms.count', 'alarms.updated', 'alarms.status.']
  }
} as const satisfies Record<string, PackDef>

export type PackName = keyof typeof PACKS
export const PACK_NAMES = Object.keys(PACKS) as PackName[]
export const CORE = 'core'
export type SliceKind = typeof CORE | PackName

/** Which slice a dictionary key belongs to. */
export function sliceOf(key: string): SliceKind {
  const head = key.split('.')[0] ?? key
  return (
    PACK_NAMES.find(name => {
      const def: PackDef = PACKS[name]
      return def.prefixes.includes(head) && !def.keep?.some(k => key.startsWith(k))
    }) ?? CORE
  )
}
