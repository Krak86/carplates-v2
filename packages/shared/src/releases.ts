import { DAYS as NOV_2026 } from './releases/2026-11.js'
import { DAYS as OCT_2026 } from './releases/2026-10.js'
import { DAYS as SEP_2026 } from './releases/2026-09.js'
import type { ReleaseDay } from './releases/core.js'

export * from './releases/core.js'

/**
 * Whole change log, for the API (monthly digest) and tests. The web never imports this barrel: it loads one
 * `releases/<yyyy-mm>.ts` chunk per month on demand. Add days to the newest month file (newest day at the top, one line
 * per item); the page sorts by date, so order is not significant.
 */
export const RELEASES: readonly ReleaseDay[] = [...NOV_2026, ...OCT_2026, ...SEP_2026]
