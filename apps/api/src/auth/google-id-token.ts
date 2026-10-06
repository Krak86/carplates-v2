import { createPublicKey, verify } from 'node:crypto'
import type { JsonWebKey, KeyObject } from 'node:crypto'

import { z } from 'zod'

export const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com'])
/** Clock drift tolerated on `exp` / `iat`. */
const SKEW_S = 60
/** Used when Google's response carries no `Cache-Control: max-age` (it normally says ~6 h). */
const DEFAULT_JWKS_TTL_MS = 60 * 60 * 1000
/** An unknown `kid` re-fetches the keys at most this often — forged kids can't turn into a fetch storm. */
const MIN_REFETCH_MS = 60 * 1000

export class InvalidIdTokenError extends Error {
  constructor(reason: string) {
    super(`Invalid Google ID token: ${reason}`)
    this.name = 'InvalidIdTokenError'
  }
}

export type GoogleIdentity = {
  subject: string
  email: string
  name: string | null
  picture: string | null
}

const headerSchema = z.object({ alg: z.literal('RS256'), kid: z.string().min(1) })

const payloadSchema = z.object({
  iss: z.string(),
  aud: z.string(),
  sub: z.string().min(1),
  exp: z.number(),
  iat: z.number(),
  email: z.string().email(),
  email_verified: z.boolean(),
  name: z.string().optional(),
  picture: z.string().url().optional()
})

const jwksSchema = z.object({
  keys: z.array(z.object({ kid: z.string(), kty: z.literal('RSA'), n: z.string(), e: z.string() }).loose())
})

type FetchLike = (url: string) => Promise<Response>

function decodePart(part: string): unknown {
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
  } catch {
    throw new InvalidIdTokenError('malformed segment')
  }
}

function maxAgeMs(res: Response): number {
  const match = /max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '')
  return match ? Number(match[1]) * 1000 : DEFAULT_JWKS_TTL_MS
}

/**
 * Verifies a Google Identity Services ID token (RS256 JWT) locally against Google's published signing keys —
 * signature, issuer, audience (our client id), expiry and `email_verified` — the checks Google's own
 * `google-auth-library` performs, without the dependency. Keys are cached per the JWKS response's max-age and
 * re-fetched once on an unknown `kid` (Google rotates them).
 */
export class GoogleIdTokenVerifier {
  private keys = new Map<string, KeyObject>()
  private keysExpireAt = 0
  private fetchedAt = Number.NEGATIVE_INFINITY

  constructor(
    private readonly clientId: string,
    private readonly fetchFn: FetchLike = url => fetch(url, { signal: AbortSignal.timeout(5000) }),
    private readonly now: () => number = Date.now
  ) {}

  async verify(token: string): Promise<GoogleIdentity> {
    const parts = token.split('.')
    if (parts.length !== 3) throw new InvalidIdTokenError('not a JWT')
    const [headerPart, payloadPart, signaturePart] = parts as [string, string, string]

    const header = headerSchema.safeParse(decodePart(headerPart))
    if (!header.success) throw new InvalidIdTokenError('unsupported header')

    const key = await this.key(header.data.kid)
    const signedOk = verify(
      'RSA-SHA256',
      Buffer.from(`${headerPart}.${payloadPart}`),
      key,
      Buffer.from(signaturePart, 'base64url')
    )
    if (!signedOk) throw new InvalidIdTokenError('bad signature')

    const payload = payloadSchema.safeParse(decodePart(payloadPart))
    if (!payload.success) throw new InvalidIdTokenError('unexpected claims')
    const claims = payload.data
    const nowS = this.now() / 1000

    if (!GOOGLE_ISSUERS.has(claims.iss)) throw new InvalidIdTokenError('wrong issuer')
    if (claims.aud !== this.clientId) throw new InvalidIdTokenError('wrong audience')
    if (claims.exp + SKEW_S < nowS) throw new InvalidIdTokenError('expired')
    if (claims.iat - SKEW_S > nowS) throw new InvalidIdTokenError('issued in the future')
    if (!claims.email_verified) throw new InvalidIdTokenError('email not verified')

    return {
      subject: claims.sub,
      email: claims.email.toLowerCase(),
      name: claims.name ?? null,
      picture: claims.picture ?? null
    }
  }

  private async key(kid: string): Promise<KeyObject> {
    const now = this.now()
    const stale = now >= this.keysExpireAt
    const unknownKid = !this.keys.has(kid) && now - this.fetchedAt >= MIN_REFETCH_MS
    if (stale || unknownKid) await this.refreshKeys()
    const key = this.keys.get(kid)
    if (!key) throw new InvalidIdTokenError('unknown signing key')
    return key
  }

  private async refreshKeys(): Promise<void> {
    const res = await this.fetchFn(GOOGLE_JWKS_URL)
    if (!res.ok) throw new Error(`Google JWKS fetch failed: ${res.status}`)
    const jwks = jwksSchema.parse(await res.json())
    this.keys = new Map(
      jwks.keys.map(jwk => [jwk.kid, createPublicKey({ key: jwk as JsonWebKey, format: 'jwk' })] as const)
    )
    this.fetchedAt = this.now()
    this.keysExpireAt = this.fetchedAt + maxAgeMs(res)
  }
}
