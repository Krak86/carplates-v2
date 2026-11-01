import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import type { Lang } from '@/i18n'

const HTML_LANG: Record<Lang, string> = { ua: 'uk', ru: 'ru', en: 'en' }

/** Static route → the `nav.*` i18n key naming it. Search/deep-link routes set their own title. */
export const ROUTE_TITLE_KEYS: Record<string, string> = {
  '/about': 'nav.about',
  '/install': 'install.heading',
  '/privacy': 'legal.privacy.heading',
  '/terms': 'legal.terms.heading',
  '/contact': 'contact.heading',
  '/history': 'nav.history',
  '/favorites': 'nav.favorites',
  '/stats': 'nav.stats',
  '/cars': 'catalog.browseTitle',
  '/compare': 'compare.title',
  '/customs': 'customs.title',
  '/wanted': 'wanted.stats.title',
  '/auctions': 'auctions.page.title',
  '/fuel': 'nav.fuel',
  '/safety': 'nav.safety',
  '/road-safety': 'nav.roadSafety',
  '/news': 'nav.news',
  '/discuss': 'nav.discuss',
  '/advanced-search': 'nav.advancedSearch',
  '/play': 'nav.play',
  '/race': 'nav.race',
  '/relax': 'nav.relax',
  '/releases': 'nav.releases',
  '/read': 'nav.read',
  '/read/body-types': 'nav.readBodyTypes',
  '/read/sizes': 'nav.readSizes',
  '/read/fleet': 'nav.readFleet',
  '/read/plates': 'nav.readPlates',
  '/read/generations': 'nav.readGenerations',
  '/read/electric': 'nav.readElectric',
  '/read/imports': 'nav.readImports',
  '/read/safety': 'nav.readSafety',
  '/read/fuel': 'nav.readFuel',
  '/read/vin': 'nav.readVin',
  '/read/extremes': 'nav.readExtremes',
  '/read/recalls': 'nav.readRecalls',
  '/read/auctions': 'nav.readAuctions',
  '/share': 'nav.share',
  '/sitemap': 'nav.sitemap',
  '/data-status': 'nav.dataStatus',
  '/features': 'nav.features',
  '/settings': 'nav.settings',
  '/profile': 'auth.profile',
  '/login': 'auth.signIn',
  '/logout': 'auth.signOut',
  '/unsubscribe': 'digest.unsubscribe.title',
  '/admin': 'nav.admin'
}

/**
 * Sets `document.title` (`"Cars UA - <page>"`, or the app name + tagline when `page` is null)
 * and keeps `<html lang>` in step with the UI language. Re-runs on language change.
 * `undefined` leaves the title to whichever page owns it (the search route, under `/:query`).
 */
export function useDocumentTitle(page: string | null | undefined): void {
  const { t, i18n } = useTranslation()
  const appName = t('app.title')
  const tagline = t('app.tagline')

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[i18n.language as Lang] ?? 'uk'
  }, [i18n.language])

  useEffect(() => {
    if (page === undefined) return
    document.title = page ? `${appName} - ${page}` : `${appName} - ${tagline}`
  }, [page, appName, tagline])
}
