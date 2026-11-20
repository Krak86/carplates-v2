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
  },
  compare: {
    prefixes: ['compare'],
    owners: ['src/routes/compare/', 'src/components/compare/', 'src/lib/export-compare.ts'],
    keep: ['compare.title', 'compare.chip', 'compare.tray.']
  },
  stats: {
    prefixes: ['stats'],
    owners: ['src/routes/stats/'],
    keep: [
      'stats.viewLink',
      'stats.noRows',
      'stats.filterPlaceholder',
      'stats.map.noData',
      'stats.map.fuel.',
      'stats.map.mode',
      'stats.view.',
      // Home panels (SearchRoute) and /read/extremes render TopStatsPanel / WeightModelsPanel outside the stats route.
      'stats.top.',
      'stats.weight.'
    ]
  },
  read: {
    prefixes: ['read'],
    owners: ['src/routes/read/'],
    // `read.card.*` / `read.cost.*`: ResultCard, AuctionCheck, ReadGuideLink; `ExamplePlates` also renders on the catalog model page.
    keep: [
      'read.card.',
      'read.cost.',
      'read.showPlates',
      'read.hidePlates',
      'read.plates.loading',
      'read.plates.error',
      'read.plates.empty'
    ]
  },
  size: {
    prefixes: ['size'],
    // CompareRanges builds `size.<bay|garage>.*` / `size.verdict.*` (all kept in core); the scan only sees the template literal.
    owners: ['src/components/size/', 'src/routes/read/', 'src/components/compare/CompareRanges.tsx'],
    // Everything the always-rendered section, ResultCard, compare and the exports use; the tabs' texts (about, tips, links,
    // norms, road signs, mirrors) load with the lazy tab chunks.
    keep: [
      'size.title',
      'size.show',
      'size.hide',
      'size.lead',
      'size.typicalOnly',
      'size.estimatedNote',
      'size.tab.',
      'size.shape.',
      'size.chip.',
      'size.class.',
      'size.field.',
      'size.verdict.',
      'size.bay.',
      'size.garage.',
      'size.schema.',
      'size.range',
      'size.source'
    ]
  },
  safety: {
    prefixes: ['safety'],
    // The rating cards load with the `SafetyRatings` section chunk, the /safety models panel and /read/safety; the report
    // export loads the pack itself (`use-copy-all-info-actions.ts`).
    owners: [
      'src/components/SafetyRatings.tsx',
      'src/components/CncapRatings.tsx',
      'src/components/EuroNcapRatings.tsx',
      'src/components/IihsRatings.tsx',
      'src/components/JncapRatings.tsx',
      'src/components/KncapRatings.tsx',
      'src/components/NhtsaRatings.tsx',
      'src/routes/safety/',
      'src/routes/read/safety/',
      'src/lib/export-report.ts'
    ],
    // `safety.viewLink`: QuickLinks (layout); `safety.chip.` / `safety.tab`: SafetyStarsChip in the card header;
    // `safety.video`: YouTubeModal / CrashVideoModal, also opened from VideoStrip.
    keep: ['safety.viewLink', 'safety.chip.', 'safety.tab', 'safety.video']
  },
  vin: {
    prefixes: ['vin'],
    // The plate card, the VIN card and everything in them. `rdw` stays core (RdwSpecs.helpers is eager and builds
    // `rdw.<key>` labels), and so do the `vin.info.about` labels of the eager FieldRow / SectionInfo / NoRegionBadge.
    owners: [
      'src/components/vin/',
      'src/components/ResultCard.tsx',
      'src/components/VinResult.tsx',
      'src/components/PlateSegments.tsx',
      'src/components/DriverAssistSection.tsx',
      'src/components/EstimatedValueSection.tsx',
      'src/components/MotFaults.tsx',
      'src/components/RdwRecalls.tsx',
      'src/components/RdwSpecs.tsx',
      'src/components/WikiSpecs.tsx',
      'src/components/paid/PaidFeatureSections.tsx',
      'src/routes/read/vin/',
      'src/lib/export-report.ts'
    ],
    keep: ['vin.info.about']
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
