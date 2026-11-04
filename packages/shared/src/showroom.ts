import { z } from 'zod'

import { model3dSchema, model360Schema, winner360Schema } from './schemas.js'

/**
 * Virtual showroom (`/showroom`): every make/model that has an immersive view, whatever the source.
 * New immersive kinds (AR, XR, ...) are added to `SHOWROOM_KINDS` and to the counts of `showroomItemSchema`.
 */
export const SHOWROOM_KINDS = ['360', '3d', 'tuning', 'oem'] as const
export type ShowroomKind = (typeof SHOWROOM_KINDS)[number]

/** A list filter: one kind, or everything. */
export const SHOWROOM_FILTERS = ['all', ...SHOWROOM_KINDS] as const
export type ShowroomFilter = (typeof SHOWROOM_FILTERS)[number]
export const DEFAULT_SHOWROOM_FILTER: ShowroomFilter = 'all'

export const SHOWROOM_PAGE_SIZE = 48

/** Page layouts (`?layout=`): big cards, compact rows, or images only. */
export const SHOWROOM_VIEWS = ['grid', 'list', 'gallery'] as const
export type ShowroomView = (typeof SHOWROOM_VIEWS)[number]
export const DEFAULT_SHOWROOM_VIEW: ShowroomView = 'grid'

export const parseShowroomView = (value: string | null | undefined): ShowroomView =>
  SHOWROOM_VIEWS.find(v => v === value) ?? DEFAULT_SHOWROOM_VIEW

/** The query params that make a showroom link reproduce the page: tab, search, layout and the open entry (`open=brand/model&show=kind`). */
export const SHOWROOM_SHARE_PARAMS = ['kind', 'q', 'layout', 'open', 'show'] as const

export type ShowroomOpen = { brandSlug: string; modelSlug: string; kind: ShowroomKind }

/** `?open=` value of an entry. */
export const showroomOpenParam = (brandSlug: string, modelSlug: string): string => `${brandSlug}/${modelSlug}`

/** `?open=brand/model&show=360` -> the entry to open, or null when either is missing or unknown. */
export function parseShowroomOpen(
  open: string | null | undefined,
  show: string | null | undefined
): ShowroomOpen | null {
  const kind = SHOWROOM_KINDS.find(k => k === show)
  const at = open?.indexOf('/') ?? -1
  if (!open || !kind || at < 1 || at === open.length - 1) return null
  return { brandSlug: open.slice(0, at), modelSlug: open.slice(at + 1), kind }
}

/** `?kind=` of the page: anything unknown is `all`. */
export const parseShowroomFilter = (value: string | null | undefined): ShowroomFilter =>
  SHOWROOM_FILTERS.find(f => f === value) ?? DEFAULT_SHOWROOM_FILTER

export const showroomItemSchema = z.object({
  brandSlug: z.string(),
  modelSlug: z.string(),
  /** "Kia Ceed", built from the sources' own names (or their slugs). */
  label: z.string(),
  n360: z.number().int().nonnegative(),
  n3d: z.number().int().nonnegative(),
  nTuning: z.number().int().nonnegative(),
  /** Official manufacturer links (configurator, model page). */
  nOem: z.number().int().nonnegative(),
  thumbUrl: z.string().nullable()
})
export type ShowroomItem = z.infer<typeof showroomItemSchema>

export const showroomListSchema = z.object({
  items: z.array(showroomItemSchema),
  total: z.number().int().nonnegative(),
  /** Whole-catalog counts per kind (not narrowed by the search), for the filter chips. */
  counts: z.object({
    all: z.number().int().nonnegative(),
    '360': z.number().int().nonnegative(),
    '3d': z.number().int().nonnegative(),
    tuning: z.number().int().nonnegative(),
    oem: z.number().int().nonnegative()
  })
})
export type ShowroomList = z.infer<typeof showroomListSchema>

export const showroomTuningPageSchema = z.object({
  path: z.string(),
  body: z.string(),
  generation: z.string(),
  startYear: z.number().int()
})
export type ShowroomTuningPage = z.infer<typeof showroomTuningPageSchema>

/** Kinds of official link: the manufacturer's own configurator, or just its model page. */
export const OEM_LINK_KINDS = ['configurator', 'model-page'] as const
export type OemLinkKind = (typeof OEM_LINK_KINDS)[number]

export const showroomOemLinkSchema = z.object({
  url: z.string(),
  variant: z.string(),
  kind: z.enum(OEM_LINK_KINDS)
})
export type ShowroomOemLink = z.infer<typeof showroomOemLinkSchema>

/** Everything one showroom entry opens: the same shapes the car-card modals take. */
export const showroomDetailSchema = z.object({
  label: z.string(),
  models3d: z.array(model3dSchema),
  models360: z.array(model360Schema),
  winner: z.array(winner360Schema),
  tuning: z.array(showroomTuningPageSchema),
  oem: z.array(showroomOemLinkSchema)
})
export type ShowroomDetail = z.infer<typeof showroomDetailSchema>

/** Does the item have this kind? */
export const showroomHas = (item: ShowroomItem, kind: ShowroomFilter): boolean =>
  kind === 'all'
    ? item.n360 + item.n3d + item.nTuning + item.nOem > 0
    : kind === '360'
      ? item.n360 > 0
      : kind === '3d'
        ? item.n3d > 0
        : kind === 'tuning'
          ? item.nTuning > 0
          : item.nOem > 0

/** Every search word must appear in the label or the slugs (case and punctuation ignored). */
export function showroomMatches(item: ShowroomItem, query: string): boolean {
  const norm = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')
  const words = norm(query).split(' ').filter(Boolean)
  if (words.length === 0) return true
  const haystack = ` ${norm(`${item.label} ${item.brandSlug} ${item.modelSlug}`)}`
  return words.every(w => haystack.includes(w))
}

/** A slug as a name: "mercedes-benz" -> "Mercedes Benz", "x5" -> "X5", "gt" -> "GT", "db12" -> "DB12" (a 1-3 letter word without a vowel, or 1-2 letters plus digits, is upper-cased). */
export function showroomTitleize(slug: string): string {
  return slug
    .split(/[-.\s]+/)
    .filter(Boolean)
    .map(w =>
      (/^[a-z]{1,3}$/.test(w) && !/[aeiouy]/.test(w)) || /^[a-z]{1,2}\d+$/.test(w)
        ? w.toUpperCase()
        : w[0]!.toUpperCase() + w.slice(1)
    )
    .join(' ')
}
