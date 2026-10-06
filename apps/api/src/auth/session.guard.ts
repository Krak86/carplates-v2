import { ForbiddenException, Inject, Injectable, UnauthorizedException, createParamDecorator } from '@nestjs/common'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { SessionUser } from '@carplates/shared'
import type { FastifyRequest } from 'fastify'

import { AuthService } from './auth.service.js'
import { readSessionCookie } from './session-cookie.js'

type AuthedRequest = FastifyRequest & { sessionUser?: SessionUser }

/** Resolves the session cookie and attaches the user to the request; 401 without a live session. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>()
    const token = readSessionCookie(req.headers.cookie)
    const user = token ? await this.authService.userForToken(token) : null
    if (!user) throw new UnauthorizedException('Sign-in required')
    req.sessionUser = user
    return true
  }
}

/** SessionGuard + `role = 'admin'` (granted in the DB only). */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Inject(SessionGuard) private readonly sessionGuard: SessionGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.sessionGuard.canActivate(context)
    const req = context.switchToHttp().getRequest<AuthedRequest>()
    if (req.sessionUser?.role !== 'admin') throw new ForbiddenException('Admins only')
    return true
  }
}

/** The signed-in user — only on routes behind SessionGuard / AdminGuard. */
export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): SessionUser => {
  const user = context.switchToHttp().getRequest<AuthedRequest>().sessionUser
  if (!user) throw new UnauthorizedException('Sign-in required')
  return user
})

/** The raw session token from the cookie, or null — for routes that work signed in or not. */
export const SessionToken = createParamDecorator((_: unknown, context: ExecutionContext): string | null =>
  readSessionCookie(context.switchToHttp().getRequest<FastifyRequest>().headers.cookie)
)
