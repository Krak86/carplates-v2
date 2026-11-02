import { Injectable, StreamableFile } from '@nestjs/common'
import type { CallHandler, CanActivate, ExecutionContext, NestInterceptor } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { FastifyReply } from 'fastify'
import { map } from 'rxjs'
import type { Observable } from 'rxjs'

/** Headers every share response carries: a link is private, so no indexing and no `Referer` that could leak the token. */
export const SHARE_PRIVACY_HEADERS = { 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer' } as const

/**
 * Sets the privacy headers before the handler runs, so error answers (410 expired) carry them too.
 * A guard rather than `@Header`, which Nest only applies to successful responses.
 */
@Injectable()
export class SharePrivacyHeadersGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const reply = context.switchToHttp().getResponse<FastifyReply>()
    for (const [name, value] of Object.entries(SHARE_PRIVACY_HEADERS)) void reply.header(name, value)
    return true
  }
}

/** Per-signed-in-user rate limit (a shared carrier IP must not use up everyone's quota); run it after `SessionGuard`. */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.sessionUser as { id?: string } | undefined
    return Promise.resolve(user?.id ?? String(req.ip))
  }
}

/** The stored photo plus how long it may be cached, so the interceptor can set `Cache-Control` without `@Res()`. */
export class ShareImageResult {
  constructor(
    readonly file: StreamableFile,
    readonly maxAgeS: number
  ) {}
}

/** Turns a `ShareImageResult` into the plain stream plus `Cache-Control: private, max-age=<time left, capped>`. */
@Injectable()
export class ShareImageInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((value: unknown) => {
        if (!(value instanceof ShareImageResult)) return value
        const reply = context.switchToHttp().getResponse<FastifyReply>()
        void reply.header('cache-control', value.maxAgeS > 0 ? `private, max-age=${value.maxAgeS}` : 'no-store')
        return value.file
      })
    )
  }
}
