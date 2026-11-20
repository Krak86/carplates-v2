import { AUCTIONS_GUIDE_PATH, IMPORTS_PATH, PLATES_PATH, VIN_PATH } from '@/routes/read/links'

/** The newest registration that still carries a plate: the registry stopped publishing plates after it (ГСЦ МВС order №67/ОД). */
export const PLATES_UNTIL = '2026-04-29'

/** Why a well-formed plate can be missing, in the order shown; `result.notFound.reason.<key>` in ua/ru/en. */
export const NOT_FOUND_REASONS = ['before', 'after', 'restore', 'sources', 'delay', 'typo'] as const
export type NotFoundReason = (typeof NOT_FOUND_REASONS)[number]

/** Internal pages that explain more about a missing plate: `nav.*` title key and route. */
export const NOT_FOUND_LINKS = [
  { to: PLATES_PATH, titleKey: 'nav.readPlates' },
  { to: VIN_PATH, titleKey: 'nav.readVin' },
  { to: '/wanted', titleKey: 'nav.wanted' },
  { to: '/auctions', titleKey: 'nav.auctions' },
  { to: AUCTIONS_GUIDE_PATH, titleKey: 'nav.readAuctions' },
  { to: IMPORTS_PATH, titleKey: 'nav.readImports' },
  { to: '/data-status', titleKey: 'nav.dataStatus' }
] as const
