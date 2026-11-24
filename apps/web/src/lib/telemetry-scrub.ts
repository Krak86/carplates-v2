/**
 * Strips bearer tokens, plates and VINs from anything sent to PostHog / Sentry (security wiki step 1).
 * Plates and VINs are rewritten to route templates, so issues still group by route.
 */

/** Query parameters that carry a secret or personal value. `p` is the photo-share bearer token. */
const SECRET_PARAMS = ['p']

/** Path rewrites, first match wins. A SPA path with a digit in a single segment is a plate or VIN search (`/:query`). */
const PATH_TEMPLATES: [RegExp, string][] = [
  [/^\/api\/plate\/[^/]+/, '/api/plate/:plate'],
  [/^\/api\/vin\/[^/]+/, '/api/vin/:vin'],
  [/^\/api\/shares\/[^/]+/, '/api/shares/:id'],
  [/^\/[^/]*\d[^/]*(?=\/|$)/, '/:query']
]

function scrubPath(pathname: string): string {
  for (const [pattern, template] of PATH_TEMPLATES) {
    if (pattern.test(pathname)) return pathname.replace(pattern, template)
  }
  return pathname
}

/** Returns `url` with secret query params redacted and the path templated. Relative and absolute URLs both work. */
export function scrubUrl(url: string): string {
  try {
    const parsed = new URL(url, 'https://scrub.invalid')
    for (const name of SECRET_PARAMS) {
      if (parsed.searchParams.has(name)) parsed.searchParams.set(name, 'redacted')
    }
    const path = scrubPath(parsed.pathname)
    const relative = /^[a-z][a-z\d+.-]*:/i.test(url) ? parsed.origin : ''
    return `${relative}${path}${parsed.search}${parsed.hash}`
  } catch {
    return '[unparseable-url]'
  }
}

/** First 8 hex chars of SHA-256: lets one share's events be correlated without a usable token. */
export async function shareRef(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest).slice(0, 4), b => b.toString(16).padStart(2, '0')).join('')
}

type SentryLike = {
  request?: { url?: string; query_string?: unknown; headers?: Record<string, string> }
  breadcrumbs?: { data?: Record<string, unknown>; message?: string }[]
  transaction?: string
}

/** Sentry `beforeSend` / `beforeSendTransaction`: scrub the request URL, referrer, transaction name and breadcrumbs. */
export function scrubSentryEvent<T extends SentryLike>(event: T): T {
  if (event.request) {
    delete event.request.query_string
    if (event.request.url) event.request.url = scrubUrl(event.request.url)
    if (event.request.headers?.Referer) event.request.headers.Referer = scrubUrl(event.request.headers.Referer)
  }
  if (event.transaction?.startsWith('/')) event.transaction = scrubUrl(event.transaction)
  for (const crumb of event.breadcrumbs ?? []) scrubBreadcrumb(crumb)
  return event
}

/** Sentry `beforeBreadcrumb` (and the loop above): navigation and fetch/xhr crumbs carry full URLs. */
export function scrubBreadcrumb<T extends { data?: Record<string, unknown> }>(crumb: T): T {
  const data = crumb.data
  if (!data) return crumb
  for (const key of ['url', 'from', 'to']) {
    const value = data[key]
    if (typeof value === 'string') data[key] = scrubUrl(value)
  }
  return crumb
}

type PostHogEvent = { properties?: Record<string, unknown> } | null

/** PostHog `before_send`: URL-valued properties on every event. */
export function scrubPostHogEvent<T extends PostHogEvent>(event: T): T {
  const props = event?.properties
  if (!props) return event
  for (const key of ['$current_url', '$referrer', '$pathname', '$initial_current_url', '$initial_referrer']) {
    const value = props[key]
    if (typeof value === 'string') props[key] = key === '$pathname' ? scrubPath(value) : scrubUrl(value)
  }
  return event
}
