import { cspViolationBodySchema } from './types.js'
import type { CspReportRequest, CspViolation } from './types.js'

export const CSP_REPORT_PATH = '/api/csp-report'
/** Browsers send `report-uri` as the first and the Reporting API (`report-to`) as the second. */
export const CSP_REPORT_CONTENT_TYPES = ['application/csp-report', 'application/reports+json']

/** Extensions inject these; they are never our policy's fault. */
const EXTENSION_SCHEMES = ['chrome-extension', 'moz-extension', 'safari-extension', 'safari-web-extension']
/** An opaque id (share token and the like) in a path: never forward it. */
const TOKEN_SEGMENT = /^[A-Za-z0-9_-]{22,}$/

const isExtensionUri = (uri: string): boolean => {
  const value = uri.trim().toLowerCase()
  // Chrome sends the bare scheme (`chrome-extension`, no colon) as `source-file` for eval reports (CARSUA-1S).
  return EXTENSION_SCHEMES.some(s => value === s || value.startsWith(`${s}:`))
}

/** `data:` URIs arrive as `data` (legacy, truncated) or `data:...`; `about:blank` as `about` or `about:...`. */
const isNoiseUri = (uri: string): boolean => {
  const value = uri.trim().toLowerCase()
  if (!value || value === 'data' || value === 'about') return true
  return value.startsWith('data:') || value.startsWith('about:') || isExtensionUri(value)
}

/**
 * Cloudflare JavaScript Detections injects an inline script at the edge (its hash changes per request, so it cannot be
 * allow-listed). Needs `'report-sample'` in `script-src`; the sample is the first 40 characters of the script.
 */
const CLOUDFLARE_JSD_SAMPLES = ['(function(){function c(){var b=a.conten', 'window.__CF$cv$params={r:'] // snippet + the script it writes into its hidden about:blank iframe (CARSUA-2A)

const isCloudflareJsd = (v: CspViolation): boolean =>
  (v.blockedUrl === 'inline' &&
    v.directive.startsWith('script-src') &&
    CLOUDFLARE_JSD_SAMPLES.some(p => v.sample.startsWith(p))) ||
  isCloudflareChallengePath(v.blockedUrl)

/** The same snippet's own requests (`/cdn-cgi/challenge-platform/...` script and `oneshot` POST, CARSUA-28) are reported too, even though they are same-origin. */
const isCloudflareChallengePath = (uri: string): boolean => {
  try {
    return new URL(uri).pathname.startsWith('/cdn-cgi/challenge-platform/')
  } catch {
    return false
  }
}

/**
 * Cloudflare Web Analytics is auto-injected into every HTML response, including `/telegram-frame.html`, whose strict policy has
 * no analytics host (CARSUA-29). The site policy allows the beacon, so any blocked `script-src` report for it comes from the frame.
 */
const isFrameBeacon = (v: CspViolation): boolean => {
  if (!v.directive.startsWith('script-src')) return false
  try {
    return new URL(v.blockedUrl).hostname === 'static.cloudflareinsights.com'
  } catch {
    return false
  }
}

/** Dropped before Sentry: an empty/extension/`data`/`about` blocked URI, a script that lives in an extension, the Cloudflare JSD snippet, or the Cloudflare beacon. */
export const isNoise = (v: CspViolation): boolean =>
  isNoiseUri(v.blockedUrl) ||
  isExtensionUri(v.sourceFile) ||
  isIgnoredHost(v.blockedUrl) ||
  isCloudflareJsd(v) ||
  isFrameBeacon(v)

/**
 * Hosts a vendor injects and we block on purpose (never allow-list them). Disqus loads LiveIntent (`liadm.com`) ad / identity
 * scripts, frames and beacons; under enforcement they stay blocked, so the reports carry no signal.
 */
export const IGNORED_BLOCKED_HOSTS = ['liadm.com']

const isIgnoredHost = (uri: string): boolean => {
  try {
    const { hostname } = new URL(uri)
    return IGNORED_BLOCKED_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`))
  } catch {
    return false
  }
}

/**
 * Drops query + hash (share tokens, OAuth params, ids) and opaque path segments from a URL; keywords such as
 * `inline` / `eval` and unparsable values pass through (capped).
 */
export const sanitizeUri = (uri: string): string => {
  try {
    const url = new URL(uri)
    if (!url.host) return url.protocol
    const path = url.pathname
      .split('/')
      .map(seg => (TOKEN_SEGMENT.test(seg) ? ':token' : seg))
      .join('/')
    return `${url.origin}${path}`
  } catch {
    return uri.slice(0, 200)
  }
}

/** The origin (or keyword) of a blocked URI: the stable part to group by. */
export const blockedOrigin = (uri: string): string => {
  try {
    const url = new URL(uri)
    return url.host ? url.origin : url.protocol
  } catch {
    return uri.slice(0, 64) || 'unknown'
  }
}

/** Both wire formats into one list of violations; non-CSP and unparsable Reporting API entries are skipped. */
export function toViolations(request: CspReportRequest): CspViolation[] {
  if (Array.isArray(request)) {
    return request.flatMap(entry => {
      if (entry.type !== 'csp-violation') return []
      const parsed = cspViolationBodySchema.safeParse(entry.body)
      if (!parsed.success) return []
      const b = parsed.data
      return [
        {
          documentUrl: b.documentURL ?? '',
          blockedUrl: b.blockedURL ?? '',
          directive: b.effectiveDirective ?? '',
          disposition: b.disposition ?? '',
          sourceFile: b.sourceFile ?? '',
          line: b.lineNumber ?? null,
          column: b.columnNumber ?? null,
          sample: b.sample ?? ''
        }
      ]
    })
  }
  const r = request['csp-report']
  return [
    {
      documentUrl: r['document-uri'] ?? '',
      blockedUrl: r['blocked-uri'] ?? '',
      directive: r['effective-directive'] ?? r['violated-directive'] ?? '',
      disposition: r.disposition ?? '',
      sourceFile: r['source-file'] ?? '',
      line: r['line-number'] ?? null,
      column: r['column-number'] ?? null,
      sample: r['script-sample'] ?? ''
    }
  ]
}
