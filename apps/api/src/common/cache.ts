import type { CallHandler, ExecutionContext, NestInterceptor, Type } from '@nestjs/common'
import type { Observable } from 'rxjs'
import { tap } from 'rxjs'

/** Global rollups rebuilt by cron (Tue + Fri), the same for everyone: browser + Cloudflare edge may reuse them for 5 min. */
export const ROLLUP_CACHE = 'public, max-age=300'

/** Per-model lookups (vdb, rdw, wiki): browser 1 h, Cloudflare edge 1 day (`s-maxage`); the data only changes on ingest or re-scrape. */
export const LOOKUP_CACHE = 'public, max-age=3600, s-maxage=86400'
/** RDW recalls are updated by the authority itself, so keep the edge copy short. */
export const RECALLS_CACHE = 'public, max-age=900, s-maxage=3600'

/**
 * Sets `Cache-Control` on a successful response, except when the query asks for `refresh=true` (that writes to the
 * store and must never be cached). Errors are not cached because the header is only set once the handler resolved.
 */
export const lookupCacheInterceptor = (value: string): Type<NestInterceptor> => {
  class LookupCacheInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
      const http = context.switchToHttp()
      const refresh = (http.getRequest<{ query?: { refresh?: string } }>().query ?? {}).refresh === 'true'
      return next.handle().pipe(
        tap(() => {
          http
            .getResponse<{ header: (name: string, value: string) => void }>()
            .header('cache-control', refresh ? 'no-store' : value)
        })
      )
    }
  }
  return LookupCacheInterceptor
}
