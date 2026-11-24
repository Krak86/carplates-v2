/**
 * Strips plates, VINs and share tokens from API Sentry events (security wiki step 2). Plain module with no
 * instrumented imports, so `instrument.ts` can load it before everything else.
 */

/** Path rewrites, first match wins. A single-segment path with a digit is the SPA plate / VIN page (`/:query`). */
const PATH_TEMPLATES: [RegExp, string][] = [
  [/^\/api\/plate\/[^/?#]+/, '/api/plate/:plate'],
  [/^\/api\/vin\/[^/?#]+/, '/api/vin/:vin'],
  [/^\/api\/card\/[^/?#]+/, '/api/card/:plate'],
  [/^\/api\/ria-check\/[^/?#]+/, '/api/ria-check/:plate'],
  [/^\/api\/shares\/[^/?#]+/, '/api/shares/:id'],
  [/^\/og\/[^/?#]*\d[^/?#]*/, '/og/:file'],
  [/^\/[^/?#]*\d[^/?#]*(?=[/?#]|$)/, '/:query']
]

/** Rewrites the path of a URL or bare path to route templates and drops the query string and fragment. */
export function scrubApiUrl(url: string): string {
  const match = /^([a-z][a-z\d+.-]*:\/\/[^/?#]*)?([^?#]*)/i.exec(url)
  const origin = match?.[1] ?? ''
  let path = match?.[2] ?? ''
  for (const [pattern, template] of PATH_TEMPLATES) {
    if (pattern.test(path)) {
      path = path.replace(pattern, template)
      break
    }
  }
  return `${origin}${path}`
}

type SentryLike = {
  request?: {
    url?: string
    data?: unknown
    query_string?: unknown
    cookies?: unknown
    headers?: Record<string, string>
  }
  transaction?: string
  breadcrumbs?: { data?: Record<string, unknown>; message?: string }[]
}

/** Sentry `beforeSend` / `beforeSendTransaction`: body, query string, cookies and the path / Referer / transaction / breadcrumb URLs. */
export function scrubApiEvent<T extends SentryLike>(event: T): T {
  const request = event.request
  if (request) {
    delete request.data
    delete request.query_string
    delete request.cookies
    if (request.url) request.url = scrubApiUrl(request.url)
    const headers = request.headers
    if (headers) {
      for (const name of Object.keys(headers)) {
        const lower = name.toLowerCase()
        if (lower === 'referer' || lower === 'origin') headers[name] = scrubApiUrl(headers[name] ?? '')
        else if (lower === 'cookie' || lower === 'authorization') delete headers[name]
      }
    }
  }
  // Transaction names are `GET /path` (or a bare path).
  const named = /^([A-Z]+ )?(\/.*)$/.exec(event.transaction ?? '')
  if (named) event.transaction = `${named[1] ?? ''}${scrubApiUrl(named[2] ?? '')}`
  for (const crumb of event.breadcrumbs ?? []) {
    const data = crumb.data
    if (!data) continue
    for (const key of ['url', 'from', 'to']) {
      const value = data[key]
      if (typeof value === 'string') data[key] = scrubApiUrl(value)
    }
  }
  return event
}
