import { QUIZ_EMOJI, QUIZ_IDS, RACER_LINKS } from '@/routes/play/games'
import { GUIDE_META } from '@/routes/read/links'

export type SitemapLink = {
  to: string
  icon: string
  /** i18n key of the link text. */
  labelKey: string
}

export type SitemapGroup = {
  id: string
  icon: string
  links: readonly SitemapLink[]
}

/** A feature that has no URL of its own (a popup or a menu setting): shown as a note with chips, not as links. */
export type SitemapTip = {
  id: string
  icon: string
  /** `nav.*` / `layers.*` keys naming what is inside. */
  itemKeys: readonly string[]
  /** Set when the feature has a page behind it. */
  link?: SitemapLink
}

const link = (to: string, icon: string, labelKey: string): SitemapLink => ({ to, icon, labelKey })

/** Every public page, by category. `sitemap.test.ts` fails when a route in `App.tsx` is in neither this tree nor `HIDDEN_ROUTES`. */
export const SITEMAP_GROUPS: readonly SitemapGroup[] = [
  {
    id: 'search',
    icon: '🔍',
    links: [
      link('/', '🔍', 'nav.search'),
      link('/advanced-search', '🧭', 'nav.advancedSearch'),
      link('/history', '🕘', 'nav.history'),
      link('/favorites', '⭐', 'nav.favorites'),
      link('/share', '🔗', 'nav.share')
    ]
  },
  {
    id: 'cars',
    icon: '🚗',
    links: [link('/cars', '🚗', 'nav.cars'), link('/compare', '⚖️', 'nav.compare')]
  },
  {
    id: 'stats',
    icon: '📊',
    links: [
      link('/stats', '📊', 'nav.stats'),
      link('/fuel', '🌿', 'nav.fuel'),
      link('/safety', '🛡️', 'nav.safety'),
      link('/road-safety', '🛣️', 'nav.roadSafety'),
      link('/wanted', '🚨', 'nav.wanted'),
      link('/auctions', '🔨', 'nav.auctions')
    ]
  },
  {
    id: 'read',
    icon: '📖',
    links: [
      link('/read', '📖', 'nav.read'),
      ...Object.entries(GUIDE_META).map(([to, meta]) => link(to, meta.icon, meta.titleKey))
    ]
  },
  {
    id: 'play',
    icon: '🎲',
    links: [
      link('/play', '🎲', 'nav.play'),
      ...QUIZ_IDS.map(id => link(`/play?game=${id}`, QUIZ_EMOJI[id], `play.quiz.${id}.title`)),
      ...RACER_LINKS.map(r => link(r.to, r.emoji, `play.${r.key}.title`))
    ]
  },
  {
    id: 'community',
    icon: '💬',
    links: [
      link('/news', '📰', 'nav.news'),
      link('/discuss', '💬', 'nav.discuss'),
      link('/releases', '🆕', 'nav.releases')
    ]
  },
  {
    id: 'account',
    icon: '👤',
    links: [
      link('/profile', '👤', 'auth.profile'),
      link('/settings', '⚙️', 'nav.settings'),
      link('/features', '✨', 'nav.features')
    ]
  },
  {
    id: 'about',
    icon: 'ℹ️',
    links: [
      link('/about', 'ℹ️', 'nav.about'),
      link('/install', '📲', 'nav.install'),
      link('/contact', '✉️', 'contact.heading'),
      link('/privacy', '🔒', 'legal.privacy.heading'),
      link('/terms', '📄', 'legal.terms.heading'),
      link('/data-status', '🗓️', 'nav.dataStatus'),
      link('/sitemap', '🗺️', 'nav.sitemap')
    ]
  }
]

/** Menu settings and header popups: no URL, so they are described instead of linked. */
export const SITEMAP_TIPS: readonly SitemapTip[] = [
  {
    id: 'menu',
    icon: '☰',
    itemKeys: ['nav.language', 'nav.theme', 'nav.accent', 'nav.textSize', 'nav.font', 'offline.settingsTitle']
  },
  {
    id: 'layers',
    icon: '🖼️',
    itemKeys: [
      'layers.images.title',
      'layers.map.title',
      'layers.earth.title',
      'layers.traffic.title',
      'layers.city.title'
    ]
  },
  { id: 'bell', icon: '🔔', itemKeys: [], link: link('/releases', '🆕', 'nav.releases') },
  { id: 'profile', icon: '👤', itemKeys: [], link: link('/profile', '👤', 'auth.profile') }
]

/** Routes that exist but are not pages to browse to: a plate/VIN lookup, share links, e-mail links, the admin area. */
export const HIDDEN_ROUTES: readonly string[] = ['/:query', '/go/:alias', '/auth/email', '/unsubscribe', '/login', '/logout', '/admin', '*']

/** Catalog detail pages are reached from `/cars`, not listed one by one. */
export const CATALOG_ROUTES: readonly string[] = ['/cars/:make', '/cars/:make/:model']
