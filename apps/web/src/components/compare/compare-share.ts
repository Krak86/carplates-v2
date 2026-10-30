import { OVERLAY_MODES, VIEW_CHOICES } from './size-overlay'
import type { OverlayMode, ViewChoice } from './size-overlay'

/** Every block of the page that has its own link (`?section=<id>`, anchor `#compare-<id>`). */
export const COMPARE_SECTIONS = ['highlights', 'radars', 'bars', 'shares', 'size', 'table'] as const
export type CompareSectionId = (typeof COMPARE_SECTIONS)[number]

export const sectionAnchor = (section: CompareSectionId): string => `compare-${section}`

/** The choices a link carries so it opens on the same tab (`view`, `layout`, `style`, `split`, `diff`). */
export type ShareState = Partial<Record<'view' | 'layout' | 'style' | 'split' | 'diff', string>>

export const SIZE_STYLES = ['classic', 'blueprint'] as const
export type SizeStyle = (typeof SIZE_STYLES)[number]

/** The query of a section link: both cars, the section, the tab state and the sharer's language; nothing else. */
export function compareShareParams(
  current: URLSearchParams,
  section: CompareSectionId,
  state: ShareState,
  lang: string
): URLSearchParams {
  const out = new URLSearchParams()
  for (const key of ['a', 'b']) {
    const value = current.get(key)
    if (value) out.set(key, value)
  }
  out.set('section', section)
  for (const [key, value] of Object.entries(state)) if (value) out.set(key, value)
  out.set('lang', lang)
  return out
}

/** Same readable separators as `compareHref` (`a=plate:AA1234BB&b=m:bmw/3series/2015`). */
export const readableQuery = (params: URLSearchParams): string =>
  params.toString().replace(/%3A/gi, ':').replace(/%2F/gi, '/')

export type SizeParams = {
  view?: ViewChoice
  layout?: OverlayMode
  style?: SizeStyle
  /** 0..100: where the in-place divider sits. */
  split?: number
}

const pick = <T extends string>(list: readonly T[], value: string | null): T | undefined =>
  list.find(item => item === value)

/** The size section's tabs from a link; anything unknown is ignored (the defaults apply). */
export function parseSizeParams(params: URLSearchParams): SizeParams {
  const split = Number(params.get('split'))
  return {
    view: pick(VIEW_CHOICES, params.get('view')),
    layout: pick(OVERLAY_MODES, params.get('layout')),
    style: pick(SIZE_STYLES, params.get('style')),
    ...(params.get('split') !== null && Number.isFinite(split)
      ? { split: Math.min(100, Math.max(0, Math.round(split))) }
      : {})
  }
}

/** The section a link points at, when it is one of ours. */
export const parseSection = (params: URLSearchParams): CompareSectionId | undefined =>
  pick(COMPARE_SECTIONS, params.get('section'))
