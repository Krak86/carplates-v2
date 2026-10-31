import type { ExecutionContext } from '@nestjs/common'
import type { ThrottlerModuleOptions } from '@nestjs/throttler'

/**
 * Global per-IP limits for `/api/*` (PLAN.md "Rate-limit policy"). Deliberately looser than a bare 10/s: one page
 * load fires a burst of lazy-section queries, and mobile carriers put many users behind one IP. Tune from PostHog.
 * Static assets, `/og`, `/healthz` and the SPA catch-all are not counted here (Caddy's edge limit owns those).
 */
export const GLOBAL_THROTTLE: ThrottlerModuleOptions = {
  throttlers: [
    { name: 'short', ttl: 1_000, limit: 30 },
    { name: 'medium', ttl: 60_000, limit: 150 },
    { name: 'long', ttl: 3_600_000, limit: 1_500 }
  ],
  skipIf: (ctx: ExecutionContext): boolean => {
    const req = ctx.switchToHttp().getRequest<{ url?: string }>()
    return !req.url?.startsWith('/api/')
  }
}

/** Tighter per-route caps for the endpoints a registry scraper would enumerate (overrides `medium`). */
export const PLATE_LOOKUP_THROTTLE = { medium: { limit: 100, ttl: 60_000 } }
export const VIN_DECODE_THROTTLE = { medium: { limit: 30, ttl: 60_000 } }
/** Brand origin: the brand list is enumerable, though each answer is small. */
export const ORIGIN_THROTTLE = { medium: { limit: 60, ttl: 60_000 } }
/** Catalog pages: an enumerable set (make x model), though the answer is one precomputed row. */
export const CATALOG_THROTTLE = { medium: { limit: 60, ttl: 60_000 } }
/** Token-checked unsubscribe endpoints: a forged-token guesser gets few tries (a real user needs one). */
export const UNSUBSCRIBE_THROTTLE = { medium: { limit: 20, ttl: 60_000 } }
/** Contact form (code request and send, each its own counter): a real email goes out, so a dozen per IP per hour is plenty. */
export const CONTACT_THROTTLE = { default: { ttl: 3_600_000, limit: 12 } }
