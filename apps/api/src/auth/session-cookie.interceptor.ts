import { Inject, Injectable } from '@nestjs/common'
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { map } from 'rxjs'
import type { Observable } from 'rxjs'

import { loadEnv } from '../env.js'

import { AuthService } from './auth.service.js'
import { sessionCookie } from './session-cookie.js'

/** A controller result that also sets (`token`) or clears (`null`) the session cookie. */
export class WithSessionCookie<T> {
  constructor(
    readonly body: T,
    readonly token: string | null
  ) {}
}

/**
 * Turns a `WithSessionCookie` result into `Set-Cookie` + the plain body — keeps auth controllers on the
 * "return a value, never take @Res()" rule.
 */
@Injectable()
export class SessionCookieInterceptor implements NestInterceptor {
  private readonly secure = loadEnv().NODE_ENV === 'production'

  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((value: unknown) => {
        if (!(value instanceof WithSessionCookie)) return value
        const reply = context.switchToHttp().getResponse<FastifyReply>()
        const maxAgeS = Math.floor(this.authService.sessionTtlMs / 1000)
        void reply.header('set-cookie', sessionCookie(value.token, maxAgeS, this.secure))
        void reply.header('cache-control', 'no-store')
        return value.body as unknown
      })
    )
  }
}
