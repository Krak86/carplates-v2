// Sentry must be initialized before any other import that it instruments, so
// main.ts imports this file first. No-ops unless ENABLE_TELEMETRY=true and a DSN
// is present — local dev never touches the quota.
import * as Sentry from '@sentry/nestjs'

import { loadEnv, telemetryEnabled } from './env.js'
import { scrubApiEvent } from './sentry-scrub.js'

const env = loadEnv()

if (telemetryEnabled(env)) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: env.GIT_SHA,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    // expected 503 (alarm poller has no fresh snapshot, e.g. upstream rate limit): the service already logs a warning.
    // NHTSA vPIC down / rate-limited (CARSUA-2S): an upstream outage, not our bug; the client already shows a retry state.
    ignoreErrors: ['no alarm data', /NHTSA decode failed: (status 5\d\d|fetch failed)/],
    // scrub request bodies, query strings, cookies and plates / VINs / share tokens in paths and Referer before they leave the process
    beforeSend: scrubApiEvent,
    beforeSendTransaction: scrubApiEvent
  })
}
