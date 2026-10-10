import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'

import { useMediaQuery } from '@/hooks/useMediaQuery'

/** Wide enough that the card (max-w-content, centred) leaves both gutters free. Tablets / phones never get the side widgets. */
export const SIDE_WIDGETS_DESKTOP_QUERY = '(min-width: 1400px)'
export const SHOW_AFTER_SCROLL_PX = 80
/** The first side-widget column appears this long after the page is up on a desktop-wide screen. */
export const SIDE_WIDGETS_DELAY_MS = 1500

/**
 * True once the viewport is desktop-wide AND `SIDE_WIDGETS_DELAY_MS` have passed since then (latched — it does not
 * flip back). The first-column (l1, r1) widgets mount on this; the second column (l2, r2) follows
 * `SECOND_COLUMN_DELAY_MS` later (`useSideCommunity`). On phones neither their code chunk nor their API requests are made.
 */
export function useSideWidgetsVisible(): boolean {
  const isDesktop = useMediaQuery(SIDE_WIDGETS_DESKTOP_QUERY)
  const [delayed, setDelayed] = useState(false)

  useEffect(() => {
    if (!isDesktop || delayed) return
    const timer = setTimeout(() => setDelayed(true), SIDE_WIDGETS_DELAY_MS)
    return (): void => clearTimeout(timer)
  }, [isDesktop, delayed])

  return isDesktop && delayed
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
