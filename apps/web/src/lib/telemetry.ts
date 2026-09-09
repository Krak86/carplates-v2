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
    const { default: posthog } = await import('posthog-js')
    posthog.init(env.VITE_POSTHOG_KEY, {
      api_host: env.VITE_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false
    })
    posthogRef = posthog
  }
}

export const capture = (event: string, props?: Record<string, unknown>): void => {
  posthogRef?.capture(event, props)
}
