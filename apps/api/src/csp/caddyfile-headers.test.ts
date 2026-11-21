import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Guards the header rules learned the hard way (PLAN.md "Helmet header review"): the Caddyfile is the only source of these
// headers, every CSP row referenced by a header exists, and Report-Only carries no directive browsers reject there.
const root = join(import.meta.dirname, '../../../..')
const caddyfile = readFileSync(join(root, 'infra/Caddyfile'), 'utf8')

const varRows = new Map(
  [...caddyfile.matchAll(/^\s*(csp_[a-z_]+)\s+"([^"]*)"\s*$/gm)].map(m => [m[1] as string, m[2] as string])
)
const cspHeaders = [...caddyfile.matchAll(/^\s*(Content-Security-Policy(?:-Report-Only)?)\s+"([^"]*)"\s*$/gm)].map(
  m => ({
    name: m[1] as string,
    value: m[2] as string
  })
)

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : path.endsWith('.ts') && !path.endsWith('.test.ts')
        ? [path]
        : []
  })

describe('infra/Caddyfile security headers', () => {
  it('defines the site and Telegram-frame CSP headers independently', () => {
    expect(cspHeaders).toHaveLength(2)
  })

  it('every {vars.*} placeholder in a CSP header has a row', () => {
    for (const { value } of cspHeaders) {
      for (const [, name] of value.matchAll(/\{vars\.([a-z_]+)\}/g))
        expect(varRows.has(name as string), name).toBe(true)
    }
  })

  it('every CSP row is used by a header (no dead rows)', () => {
    const joined = cspHeaders.map(h => h.value).join(' ')
    for (const name of varRows.keys()) expect(joined, name).toContain(`{vars.${name}}`)
  })

  it('both CSP headers are enforced, not Report-Only', () => {
    for (const h of cspHeaders) expect(h.name).toBe('Content-Security-Policy')
  })

  it('upgrade-insecure-requests is in the enforced site policy only (a Report-Only header would log a console error per frame)', () => {
    const [site, frame] = cspHeaders
    expect(site?.value).toContain('{vars.csp_site_upgrade_insecure}')
    expect(varRows.get('csp_site_upgrade_insecure')).toBe('upgrade-insecure-requests')
    expect(frame?.value).not.toMatch(/upgrade/)
    for (const h of cspHeaders.filter(h => h.name.endsWith('Report-Only')))
      expect(h.value).not.toMatch(/upgrade-insecure-requests/)
  })

  it('every row is a single directive and ends up in the policy once', () => {
    for (const [name, row] of varRows) expect(row.includes(';'), name).toBe(false)
    for (const { value } of cspHeaders) {
      const names = [...value.matchAll(/\{vars\.([a-z_]+)\}/g)].map(m => varRows.get(m[1] as string)?.split(' ')[0])
      expect(new Set(names).size).toBe(names.length)
    }
  })

  it('frame-ancestors stays self on both documents', () => {
    expect(varRows.get('csp_site_frame_ancestors')).toBe("frame-ancestors 'self'")
    expect(varRows.get('csp_frame_frame_ancestors')).toBe("frame-ancestors 'self'")
  })

  it('COOP is same-origin-allow-popups and set exactly once (same-origin would break the Google / Telegram popups)', () => {
    const rows = [...caddyfile.matchAll(/^\s*Cross-Origin-Opener-Policy\s+"([^"]*)"/gm)]
    expect(rows).toHaveLength(1)
    expect(rows[0]?.[1]).toBe('same-origin-allow-popups')
  })

  it('only Caddy sets COOP / Origin-Agent-Cluster / X-Permitted-Cross-Domain-Policies (api would double the values)', () => {
    const forbidden = /cross-origin-opener-policy|origin-agent-cluster|x-permitted-cross-domain-policies/i
    const offenders = sourceFiles(join(root, 'apps/api/src')).filter(f => forbidden.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})
