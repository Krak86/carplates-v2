import type { Cell, FeatureRow, Service } from '@/routes/alternatives/types'

const Y: Cell = 'yes'
const P: Cell = 'paid'
const H: Cell = 'partial'
const N: Cell = 'none'
const U: Cell = 'unknown'

/** Where each service is linked from the table header; `ours` has no link. */
export const SERVICE_URL: Record<Service, string | null> = {
  ours: null,
  avtonomera: 'https://ua.carplates.app',
  bazagai: 'https://baza-gai.com.ua',
  opendatabot: 'https://opendatabot.ua',
  autoria: 'https://auto.ria.com/uk/autocheck/',
  rst: 'https://rst.ua',
  carvertical: 'https://www.carvertical.com',
  carfax: 'https://www.carfax.com'
}

/** Price badge in each column header: free, paid, or a free basic part plus a paid report. */
export const SERVICE_PRICE_ICON: Record<Service, string> = {
  ours: '✅',
  avtonomera: '✅💳',
  bazagai: '✅',
  opendatabot: '✅💳',
  autoria: '✅💳',
  rst: '✅',
  carvertical: '💳',
  carfax: '💳'
}

export const CELL_ICON: Record<Cell, string> = { yes: '✅', paid: '💳', partial: '🟡', none: '➖', unknown: '❔' }

/**
 * Snapshot from the services' public pages and press reviews (2026-11-09); re-check before editing a cell.
 * Order of cells: ours, АвтоНомера (ua.carplates.app), baza-gai.com.ua, Opendatabot, AUTO.RIA, RST, carVertical, CARFAX.
 * CARFAX blocks automated reads, so only what is well known about it is marked; the rest stays "unknown".
 * i18n: `alt.row.<key>`.
 */
export const ROWS: readonly FeatureRow[] = [
  { key: 'plate', cells: [Y, Y, Y, Y, Y, N, P, N] },
  { key: 'vin', cells: [Y, Y, Y, Y, Y, N, P, P] },
  { key: 'wanted', cells: [Y, Y, Y, Y, P, N, P, U] },
  { key: 'encumbrance', cells: [N, P, N, Y, Y, N, P, U] },
  { key: 'regHistory', cells: [N, P, N, H, P, N, P, N] },
  { key: 'owners', cells: [N, N, N, N, Y, N, P, P] },
  { key: 'fines', cells: [H, N, N, Y, H, N, N, N] },
  { key: 'insurance', cells: [H, H, N, N, H, N, P, N] },
  { key: 'damage', cells: [N, N, N, N, H, N, P, P] },
  { key: 'odometer', cells: [N, N, N, N, P, N, P, P] },
  { key: 'commercial', cells: [N, N, N, N, P, N, P, U] },
  { key: 'inspection', cells: [H, N, N, N, N, N, P, U] },
  { key: 'abroad', cells: [N, N, N, N, P, N, P, P] },
  { key: 'adHistory', cells: [N, P, N, N, P, N, P, U] },
  { key: 'plateGallery', cells: [N, N, Y, N, N, N, N, N] },
  { key: 'summary', cells: [Y, U, U, U, U, N, P, U] },
  { key: 'crash', cells: [Y, N, N, N, N, N, P, U] },
  { key: 'fuel', cells: [Y, N, N, N, N, N, H, U] },
  { key: 'specs', cells: [Y, Y, Y, H, H, N, P, U] },
  { key: 'performance', cells: [Y, N, Y, N, N, N, N, U] },
  { key: 'value', cells: [Y, N, N, N, Y, N, P, U] },
  { key: 'listings', cells: [Y, N, N, N, Y, Y, N, U] },
  { key: 'marketplace', cells: [N, N, N, N, Y, Y, N, U] },
  { key: 'recognition', cells: [Y, U, N, N, U, N, N, U] },
  { key: 'catalog', cells: [Y, N, Y, N, H, H, N, U] },
  { key: 'customs', cells: [Y, N, Y, N, U, N, N, U] },
  { key: 'offline', cells: [Y, N, N, N, N, N, N, U] },
  { key: 'openSource', cells: [Y, N, N, N, N, N, N, N] }
]

const isOffered = (c: Cell): boolean => c === 'yes' || c === 'paid'

/** Cells of the other services: everything but `ours` (0). */
const rivals = (r: FeatureRow): readonly Cell[] => r.cells.slice(1)

/** Only we have it: nobody else we checked offers it. */
export const OUR_EDGE = ROWS.filter(r => r.cells[0] === 'yes' && rivals(r).every(c => c === 'none' || c === 'unknown'))

/** Someone else offers it, we do not (yet): the next-steps list. */
export const OUR_GAPS = ROWS.filter(r => r.cells[0] === 'none' && rivals(r).some(isOffered))
