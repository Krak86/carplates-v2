import { ForbiddenException, Inject, Injectable, UnauthorizedException, createParamDecorator } from '@nestjs/common'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { REAUTH_REQUIRED, SUDO_WINDOW_MINUTES } from '@carplates/shared'
import type { SessionUser } from '@carplates/shared'
import type { FastifyRequest } from 'fastify'

import { AuthService } from './auth.service.js'
import type { ResolvedSession } from './auth.service.js'
import { readSessionCookie } from './session-cookie.js'

type AuthedRequest = FastifyRequest & { sessionUser?: SessionUser; resolvedSession?: ResolvedSession }

/** Resolves the session cookie and attaches the user to the request; 401 without a live session. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>()
    const token = readSessionCookie(req.headers.cookie)
    const session = token ? await this.authService.resolveSession(token) : null
    if (!session) throw new UnauthorizedException('Sign-in required')
    req.sessionUser = session.user
    req.resolvedSession = session
    return true
  }
}

/**
 * SessionGuard + a recent sign-in ("sudo mode"): security-sensitive actions (change email, link/unlink, delete) need the
 * session's last authentication to be under SUDO_WINDOW_MINUTES old, else 403 REAUTH_REQUIRED and the client re-authenticates.
 */
@Injectable()
export class SudoGuard implements CanActivate {
  constructor(@Inject(SessionGuard) private readonly sessionGuard: SessionGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.sessionGuard.canActivate(context)
    const session = context.switchToHttp().getRequest<AuthedRequest>().resolvedSession
    if (!session || Date.now() - session.authAt.getTime() > SUDO_WINDOW_MINUTES * 60_000) {
      throw new ForbiddenException(REAUTH_REQUIRED)
    }
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

/** The resolved session (id, token hash, last authentication) — only on routes behind SessionGuard / SudoGuard / AdminGuard. */
export const CurrentSession = createParamDecorator((_: unknown, context: ExecutionContext): ResolvedSession => {
  const session = context.switchToHttp().getRequest<AuthedRequest>().resolvedSession
  if (!session) throw new UnauthorizedException('Sign-in required')
  return session
})
