import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import type { Lang } from '@/i18n'

const HTML_LANG: Record<Lang, string> = { ua: 'uk', ru: 'ru', en: 'en' }

/** Static route → the `nav.*` i18n key naming it. Search/deep-link routes set their own title. */
export const ROUTE_TITLE_KEYS: Record<string, string> = {
  '/about': 'nav.about',
  '/history': 'nav.history',
  '/favorites': 'nav.favorites',
  '/stats': 'nav.stats',
  '/fuel': 'nav.fuel',
  '/safety': 'nav.safety',
  '/news': 'nav.news',
  '/discuss': 'nav.discuss',
  '/advanced-search': 'nav.advancedSearch'
}

/**
 * Sets `document.title` (`"<page> · Cars UA"`, or the app name + tagline when `page` is null)
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
    document.title = page ? `${page} · ${appName}` : `${appName} — ${tagline}`
  }, [page, appName, tagline])
}
