export type SidebarLink = {
  to: string
  icon: string
  /** i18n key of the link text. */
  labelKey: string
  /** Matches only the exact path (the home page). */
  end?: boolean
}

export type SidebarGroup = {
  id: string
  links: readonly SidebarLink[]
}

/** Groups mirror `SITEMAP_GROUPS` (`routes/sitemap/helpers.ts`); the signed-in "personal" links are added in `Sidebar.tsx`. */
export const SIDEBAR_GROUPS: readonly SidebarGroup[] = [
  {
    id: 'search',
    links: [
      { to: '/', icon: '🔍', labelKey: 'nav.search', end: true },
      { to: '/advanced-search', icon: '🧭', labelKey: 'nav.advancedSearch' }
    ]
  },
  {
    id: 'stats',
    links: [
      { to: '/stats', icon: '📊', labelKey: 'nav.stats' },
      { to: '/fuel', icon: '🌿', labelKey: 'nav.fuel' },
      { to: '/safety', icon: '🛡️', labelKey: 'nav.safety' },
      { to: '/road-safety', icon: '🛣️', labelKey: 'nav.roadSafety' },
      { to: '/wanted', icon: '🚨', labelKey: 'nav.wanted' },
      { to: '/auctions', icon: '🔨', labelKey: 'nav.auctions' }
    ]
  },
  {
    id: 'personal',
    links: [
      { to: '/history', icon: '🕘', labelKey: 'nav.history' },
      { to: '/favorites', icon: '⭐', labelKey: 'nav.favorites' }
    ]
  },
  {
    id: 'read',
    links: [
      { to: '/read', icon: '📖', labelKey: 'nav.read' },
      { to: '/about', icon: 'ℹ️', labelKey: 'nav.about' },
      { to: '/releases', icon: '🆕', labelKey: 'nav.releases' },
      { to: '/news', icon: '📰', labelKey: 'nav.news' },
      { to: '/discuss', icon: '💬', labelKey: 'nav.discuss' }
    ]
  },
  {
    id: 'interactive',
    links: [
      { to: '/cars', icon: '🚗', labelKey: 'nav.cars' },
      { to: '/compare', icon: '⚖️', labelKey: 'nav.compare' },
      { to: '/showroom', icon: '🎬', labelKey: 'nav.showroom' },
      { to: '/play', icon: '🎲', labelKey: 'nav.play' },
      { to: '/race', icon: '🎮', labelKey: 'nav.race' }
    ]
  },
  {
    id: 'misc',
    links: [
      { to: '/relax', icon: '🧘', labelKey: 'nav.relax' },
      { to: '/share', icon: '🔗', labelKey: 'nav.share' },
      { to: '/install', icon: '📲', labelKey: 'nav.install' }
    ]
  }
]

/** Small links at the very bottom of the sidebar. */
export const SIDEBAR_FOOTER_LINKS: readonly Omit<SidebarLink, 'icon'>[] = [
  { to: '/contact', labelKey: 'contact.footerLink' },
  { to: '/sitemap', labelKey: 'nav.sitemap' },
  { to: '/data-status', labelKey: 'nav.dataStatus' },
  { to: '/discuss', labelKey: 'report.footer' },
  { to: '/privacy', labelKey: 'legal.privacy.heading' },
  { to: '/terms', labelKey: 'legal.terms.heading' }
]
