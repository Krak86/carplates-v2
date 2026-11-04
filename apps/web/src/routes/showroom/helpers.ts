import type { ShowroomItem, ShowroomKind, ShowroomTuningPage, ShowroomView } from '@carplates/shared'

/** A showroom entry opened in a modal (by slug, so a shared link can restore it), and which kind of view was asked for. */
export type OpenView = { brandSlug: string; modelSlug: string; kind: ShowroomKind }

/** Grid classes per layout. */
export const showroomGridClass = (view: ShowroomView): string =>
  view === 'list'
    ? 'grid gap-2 grid-cols-1'
    : view === 'gallery'
      ? 'grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
      : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

export const SEARCH_DEBOUNCE_MS = 350

/** The kinds an entry has, in display order, with their counts. */
export function itemKinds(item: ShowroomItem): { kind: ShowroomKind; n: number }[] {
  return [
    { kind: '360' as const, n: item.n360 },
    { kind: '3d' as const, n: item.n3d },
    { kind: 'tuning' as const, n: item.nTuning },
    { kind: 'oem' as const, n: item.nOem }
  ].filter(k => k.n > 0)
}

/** `3.door.hatchback` -> `3 door hatchback`. */
const spaced = (slug: string): string => slug.replace(/\./g, ' ').trim()

/** "Sedan E90" for a 3DTuning page (the generation slug carries its start year, which is shown separately). */
export function tuningPageLabel(page: ShowroomTuningPage): string {
  const generation = page.generation.replace(/\.?\d{4}$/, '')
  return [spaced(page.body), spaced(generation).toUpperCase()].filter(Boolean).join(' · ')
}
