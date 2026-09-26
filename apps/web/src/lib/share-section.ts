export const SHARE_SECTIONS = ['history', 'ratings', 'wiki', 'photos'] as const
export type ShareSection = (typeof SHARE_SECTIONS)[number]

export function buildShareUrl(section: ShareSection, tab?: string): string {
  const params = new URLSearchParams()
  params.set('section', section)
  if (tab) params.set('tab', tab)
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// Layout.tsx's app header is `sticky top-0 h-14` (56px) — scrolling a target flush to the
// viewport top lands it directly behind that header, hidden, not "into view" at all. A little
// extra breathing room on top of the bare header height keeps the target clear of its edge.
const STICKY_HEADER_OFFSET_PX = 64

/**
 * `Element.scrollIntoView()` on a descendant of the result Card corrupts its
 * compositor layer geometry (the Card uses a 3D `transform` for its tilt
 * effect) — verified in Chrome: calling it here, then scrolling back, leaves
 * `getBoundingClientRect()` permanently wrong for the Card and its children,
 * even with `behavior: 'instant'`. A plain `window.scrollTo` to the same
 * computed position doesn't trigger it, so use that instead.
 */
export function scrollElementIntoView(el: HTMLElement): void {
  const top = el.getBoundingClientRect().top + window.scrollY - STICKY_HEADER_OFFSET_PX
  window.scrollTo({ top, behavior: 'smooth' })
}
