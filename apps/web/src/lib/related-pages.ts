export const STATS_PAGES = ['stats', 'wanted', 'auctions', 'fuel', 'safety', 'roadSafety'] as const
export type StatsPage = (typeof STATS_PAGES)[number]

export const STATS_PAGE_PATHS: Record<StatsPage, string> = {
  stats: '/stats',
  wanted: '/wanted',
  auctions: '/auctions',
  fuel: '/fuel',
  safety: '/safety',
  roadSafety: '/road-safety'
}

export const STATS_PAGE_ICONS: Record<StatsPage, string> = {
  stats: '📊',
  wanted: '🚨',
  auctions: '🔨',
  fuel: '⛽',
  safety: '🛡️',
  roadSafety: '🚧'
}

/** Pages that make sense next to each other; every pair has its own hint text `related.<from>.<to>`. */
export const RELATED_PAGES: Record<StatsPage, readonly StatsPage[]> = {
  stats: ['wanted', 'roadSafety', 'fuel', 'safety'],
  wanted: ['stats', 'auctions', 'roadSafety'],
  auctions: ['wanted', 'stats'],
  fuel: ['stats', 'safety'],
  safety: ['fuel', 'roadSafety', 'stats'],
  roadSafety: ['safety', 'stats', 'wanted']
}

/** A link that lands on the view the hint talks about (the regional map) instead of the page default. */
export const RELATED_TARGETS: Partial<Record<`${StatsPage}>${StatsPage}`, string>> = {
  'wanted>stats': '/stats?dim=region&view=map',
  'roadSafety>stats': '/stats?dim=region&view=map',
  'stats>wanted': '/wanted?dim=region&view=map',
  'roadSafety>wanted': '/wanted?dim=region&view=map'
}

export function relatedTarget(from: StatsPage, to: StatsPage): string {
  return RELATED_TARGETS[`${from}>${to}`] ?? STATS_PAGE_PATHS[to]
}
