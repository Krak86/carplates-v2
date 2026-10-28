import { denormalizePlate, isUaPlate } from '@carplates/shared'

import i18n from '@/i18n'
import { setFontParam } from '@/store/ui-store'

export const SHARE_SECTIONS = [
  'verification',
  'basic',
  'history',
  'specs',
  'engines',
  'size',
  'recalls',
  'faults',
  'electric',
  'value',
  'vin',
  'emissions',
  'ratings',
  'nearby',
  'reviews',
  'videos',
  'wiki',
  'photos',
  'model3d',
  'model360',
  'race',
  'ar',
  'news',
  'social',
  'stock',
  'auctions',
  'origin',
  'wanted'
] as const
export type ShareSection = (typeof SHARE_SECTIONS)[number]

/**
 * Current origin + path for a shared link. A Cyrillic plate path would be pasted as an unreadable
 * `%D0%92…` string, so it is written in its Latin look-alikes (the API normalizes both to the same key).
 */
export function shareBaseUrl(): string {
  const { origin, pathname } = window.location
  const segment = pathname.slice(1)
  if (segment.includes('/')) return `${origin}${pathname}`
  let decoded: string
  try {
    decoded = decodeURIComponent(segment)
  } catch {
    return `${origin}${pathname}`
  }
  return isUaPlate(decoded) ? `${origin}/${denormalizePlate(decoded)}` : `${origin}${pathname}`
}

/** The shared link carries the sharer's language so its link preview (and the opened app) match it. */
export function buildShareUrl(section: ShareSection, tab?: string): string {
  const params = new URLSearchParams()
  params.set('section', section)
  if (tab) params.set('tab', tab)
  params.set('lang', i18n.language)
  setFontParam(params)
  return `${shareBaseUrl()}?${params.toString()}`
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
