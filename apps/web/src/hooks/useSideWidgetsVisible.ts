import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'

import { useMediaQuery } from '@/hooks/useMediaQuery'

/** Wide enough that the card (max-w-content, centred) leaves both gutters free. Tablets / phones never get the side widgets. */
export const SIDE_WIDGETS_DESKTOP_QUERY = '(min-width: 1400px)'
export const SHOW_AFTER_SCROLL_PX = 80

/**
 * True once the viewport is desktop-wide AND the page has been scrolled past the threshold at least once (latched — it
 * does not flip back at the top). The news / Bluesky widgets are only mounted when this is true, so on phones, and on
 * desktop before the first scroll, neither their code chunk nor their API requests are ever made.
 */
export function useSideWidgetsVisible(): boolean {
  const isDesktop = useMediaQuery(SIDE_WIDGETS_DESKTOP_QUERY)
  const [hasScrolled, setHasScrolled] = useState<boolean>(() => window.scrollY > SHOW_AFTER_SCROLL_PX)

  useEffect(() => {
    if (!isDesktop || hasScrolled) return
    const handleScroll = (): void => {
      if (window.scrollY > SHOW_AFTER_SCROLL_PX) setHasScrolled(true)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return (): void => window.removeEventListener('scroll', handleScroll)
  }, [isDesktop, hasScrolled])

  return isDesktop && hasScrolled
}

/**
 * True once the page has been scrolled past the threshold on the current route, and stays true while scrolling back to
 * the top. A navigation (new pathname) starts over: at the top, nothing shown until the user scrolls again.
 */
export function useScrolledOnRoute(): boolean {
  const { pathname } = useLocation()
  const [scrolledPath, setScrolledPath] = useState<string | null>(() =>
    window.scrollY > SHOW_AFTER_SCROLL_PX ? pathname : null
  )

  useEffect(() => {
    if (scrolledPath === pathname) return
    const handleScroll = (): void => {
      if (window.scrollY > SHOW_AFTER_SCROLL_PX) setScrolledPath(pathname)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return (): void => window.removeEventListener('scroll', handleScroll)
  }, [pathname, scrolledPath])

  return scrolledPath === pathname
}

/** True while the page is scrolled past the threshold; unlike the latched hooks above it flips back at the top. */
export function useScrolledNow(): boolean {
  const [scrolled, setScrolled] = useState<boolean>(() => window.scrollY > SHOW_AFTER_SCROLL_PX)

  useEffect(() => {
    const handleScroll = (): void => setScrolled(window.scrollY > SHOW_AFTER_SCROLL_PX)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return (): void => window.removeEventListener('scroll', handleScroll)
  }, [])

  return scrolled
}
