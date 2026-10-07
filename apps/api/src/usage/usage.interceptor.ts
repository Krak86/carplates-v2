import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common'
import type { UsageKind } from '@carplates/shared'
import type { FastifyRequest } from 'fastify'
import { Observable, catchError, tap, throwError } from 'rxjs'

import { readSessionCookie } from '../auth/session-cookie.js'

import { UsageService } from './usage.service.js'

/** Route pattern (Fastify's `routeOptions.url`) → what it counts as. Only the lookups; nothing else is logged. */
const ROUTE_KINDS: Record<string, UsageKind> = {
  'GET /api/plate/:plate': 'plate_search',
  'GET /api/vin/:vin': 'vin_search',
  'POST /api/recognize/plate/local': 'photo_search',
  'POST /api/recognize/plate/cloud': 'photo_search',
  'POST /api/recognize/vin': 'photo_search',
  'POST /api/auth/google': 'login'
}

/** `uk-UA,ru;q=0.8` → `ua`; only the three UI languages are kept apart, anything else is `other`. */
export const langFromHeader = (header: string | undefined): string | null => {
  const tag = header?.split(',')[0]?.split('-')[0]?.trim().toLowerCase()
  if (!tag) return null
  if (tag === 'uk') return 'ua'
  return tag === 'ru' || tag === 'en' ? tag : 'other'
}

/** Global. Records one first-party usage event per successful (or 404 = "not found") lookup. No plate/VIN/IP is stored. */
@Injectable()
export class UsageInterceptor implements NestInterceptor {
  constructor(@Inject(UsageService) private readonly usage: UsageService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<FastifyRequest>()
    const kind = ROUTE_KINDS[`${req.method} ${req.routeOptions?.url ?? ''}`]
    if (!kind) return next.handle()

    const record = (found: boolean | null): void =>
      this.usage.record({
        kind,
        found,
        lang: langFromHeader(req.headers['accept-language']),
        signedIn: !!readSessionCookie(req.headers.cookie)
      })

    return next.handle().pipe(
      tap(() => record(kind === 'login' ? null : true)),
      catchError((err: unknown) => {
        if (err instanceof NotFoundException) record(false)
        return throwError(() => err)
      })
    )
  }
}
