/**
 * PostHog + Sentry, both inert unless VITE_ENABLE_TELEMETRY=true and the
 * relevant key/DSN is set. The SDKs are dynamically imported so they stay out
 * of the main bundle when telemetry is off (the default, and always in dev).
 */
const env = import.meta.env
const enabled = env.VITE_ENABLE_TELEMETRY === 'true'

let posthogRef: typeof import('posthog-js').default | null = null

export async function initTelemetry(): Promise<void> {
  if (!enabled) return

  if (env.VITE_SENTRY_DSN) {
    const Sentry = await import('@sentry/react')
    Sentry.init({
      dsn: env.VITE_SENTRY_DSN,
      environment: env.MODE,
      release: env.VITE_GIT_SHA,
      tracesSampleRate: 0.1,
      beforeSend(event) {
        if (event.request) delete event.request.query_string
        return event
      }
    })
  }

  if (env.VITE_POSTHOG_KEY) {
    // PostHog (plus the recorder / surveys / dead-clicks / web-vitals scripts it pulls in) cost ~380 ms of main thread
    // on load; start it once the page is idle or the visitor interacts.
    await idleOrInteraction()
    const { default: posthog } = await import('posthog-js')
    posthog.init(env.VITE_POSTHOG_KEY, {
      api_host: env.VITE_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      person_profiles: 'identified_only',
      // SPA: fire $pageview on every router navigation (history API), not only the first load.
      capture_pageview: 'history_change'
    })
    posthogRef = posthog
    for (const [event, props] of pending.splice(0)) posthog.capture(event, props)
  }
}

const IDLE_TIMEOUT_MS = 4000
const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const

/** Resolves on the first interaction, or when the browser is idle (at most `IDLE_TIMEOUT_MS` after the call). */
function idleOrInteraction(): Promise<void> {
  return new Promise(resolve => {
    let idleId: number | undefined
    const done = (): void => {
      for (const name of INTERACTION_EVENTS) window.removeEventListener(name, done)
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId)
      resolve()
    }
    for (const name of INTERACTION_EVENTS) window.addEventListener(name, done, { once: true, passive: true })
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(done, { timeout: IDLE_TIMEOUT_MS })
    } else {
      setTimeout(done, IDLE_TIMEOUT_MS)
    }
  })
}

/** Events fired before PostHog has started (it waits for idle / first interaction); flushed on init. */
const pending: [string, Record<string, unknown> | undefined][] = []

export const capture = (event: string, props?: Record<string, unknown>): void => {
  if (posthogRef) posthogRef.capture(event, props)
  else if (enabled && env.VITE_POSTHOG_KEY) pending.push([event, props])
}
