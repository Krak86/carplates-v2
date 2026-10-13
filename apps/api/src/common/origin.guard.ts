import { ForbiddenException, Injectable } from '@nestjs/common'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'

import { loadEnv } from '../env.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:3000']

/**
 * Whether a state-changing request comes from our own site. `Sec-Fetch-Site` (sent by every modern browser) must be
 * `same-origin`/`none`; when only `Origin` is present it must match. Requests with neither header (curl, server-to-server)
 * carry no ambient browser cookies worth protecting and pass.
 */
export function isTrustedOrigin(
  headers: { origin?: string; 'sec-fetch-site'?: string },
  allowedOrigins: readonly string[]
): boolean {
  const site = headers['sec-fetch-site']
  if (site) return site === 'same-origin' || site === 'none'
  const { origin } = headers
  return !origin || allowedOrigins.includes(origin)
}

/** CSRF defence in depth on top of `SameSite=Lax` (security-checklist finding 3). Global guard for `/api/*` writes. */
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly allowed = this.buildAllowed()

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<FastifyRequest>()
    if (SAFE_METHODS.has(req.method) || !req.url.startsWith('/api/')) return true
    if (!isTrustedOrigin(req.headers, this.allowed)) throw new ForbiddenException('Cross-site request blocked')
    return true
  }

  private buildAllowed(): string[] {
    const env = loadEnv()
    const site = new URL(env.PUBLIC_SITE_URL).origin
    return env.NODE_ENV === 'production' ? [site] : [site, ...DEV_ORIGINS]
  }
}
