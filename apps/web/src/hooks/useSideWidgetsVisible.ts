import { useEffect, useState } from 'react'

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
