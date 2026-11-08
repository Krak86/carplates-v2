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
  return EXTENSION_SCHEMES.some(s => value.startsWith(`${s}:`))
}

/** `data:` URIs arrive as `data` (legacy, truncated) or `data:...`; `about:blank` as `about` or `about:...`. */
const isNoiseUri = (uri: string): boolean => {
  const value = uri.trim().toLowerCase()
  if (!value || value === 'data' || value === 'about') return true
  return value.startsWith('data:') || value.startsWith('about:') || isExtensionUri(value)
}

/** Dropped before Sentry: an empty/extension/`data`/`about` blocked URI, or a script that lives in an extension. */
export const isNoise = (v: CspViolation): boolean => isNoiseUri(v.blockedUrl) || isExtensionUri(v.sourceFile)

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
