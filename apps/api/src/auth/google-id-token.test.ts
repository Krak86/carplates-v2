import { generateKeyPairSync, sign } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { GOOGLE_JWKS_URL, GoogleIdTokenVerifier, InvalidIdTokenError } from './google-id-token.js'

const CLIENT_ID = 'test-client.apps.googleusercontent.com'
const NOW_S = 1_800_000_000
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' }

const b64 = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url')

function token(claims: Record<string, unknown> = {}, header: Record<string, unknown> = {}): string {
  const head = b64({ alg: 'RS256', kid: 'k1', typ: 'JWT', ...header })
  const body = b64({
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    sub: '1234567890',
    iat: NOW_S - 10,
    exp: NOW_S + 3600,
    email: 'Driver@Example.com',
    email_verified: true,
    name: 'Test Driver',
    picture: 'https://lh3.googleusercontent.com/a/x',
    ...claims
  })
  const signature = sign('RSA-SHA256', Buffer.from(`${head}.${body}`), privateKey).toString('base64url')
  return `${head}.${body}.${signature}`
}

function verifier(): { verifier: GoogleIdTokenVerifier; fetches: string[] } {
  const fetches: string[] = []
  const fetchFn = (url: string): Promise<Response> => {
    fetches.push(url)
    return Promise.resolve(
      new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'cache-control': 'public, max-age=3600' } })
    )
  }
  return { verifier: new GoogleIdTokenVerifier(CLIENT_ID, fetchFn, () => NOW_S * 1000), fetches }
}

describe('GoogleIdTokenVerifier', () => {
  it('accepts a valid token and lower-cases the email', async () => {
    const { verifier: v, fetches } = verifier()
    await expect(v.verify(token())).resolves.toEqual({
      subject: '1234567890',
      email: 'driver@example.com',
      name: 'Test Driver',
      picture: 'https://lh3.googleusercontent.com/a/x'
    })
    await v.verify(token())
    expect(fetches).toEqual([GOOGLE_JWKS_URL])
  })

  it.each([
    ['wrong audience', { aud: 'someone-else' }],
    ['wrong issuer', { iss: 'https://evil.example' }],
    ['expired', { exp: NOW_S - 3600 }],
    ['issued in the future', { iat: NOW_S + 3600 }],
    ['email not verified', { email_verified: false }]
  ])('rejects: %s', async (reason, claims) => {
    await expect(verifier().verifier.verify(token(claims))).rejects.toThrow(reason)
  })

  it('rejects a tampered payload', async () => {
    const [head, , sig] = token().split('.')
    const forged = `${head}.${b64({ aud: CLIENT_ID, email: 'admin@example.com' })}.${sig}`
    await expect(verifier().verifier.verify(forged)).rejects.toThrow('bad signature')
  })

  it('rejects an unknown key id without re-fetching more than once a minute', async () => {
    const { verifier: v, fetches } = verifier()
    await expect(v.verify(token({}, { kid: 'nope' }))).rejects.toThrow(InvalidIdTokenError)
    await expect(v.verify(token({}, { kid: 'nope' }))).rejects.toThrow('unknown signing key')
    expect(fetches).toHaveLength(1)
  })

  it('rejects non-RS256 and non-JWT input', async () => {
    await expect(verifier().verifier.verify(token({}, { alg: 'none' }))).rejects.toThrow('unsupported header')
    await expect(verifier().verifier.verify('abc')).rejects.toThrow('not a JWT')
  })
})
