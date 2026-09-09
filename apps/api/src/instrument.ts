// Sentry must be initialized before any other import that it instruments, so
// main.ts imports this file first. No-ops unless ENABLE_TELEMETRY=true and a DSN
// is present — local dev never touches the quota.
import * as Sentry from '@sentry/nestjs'

import { loadEnv, telemetryEnabled } from './env.js'

const env = loadEnv()

if (telemetryEnabled(env)) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: env.GIT_SHA,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    // scrub request bodies / query strings before they leave the process
    beforeSend(event) {
      if (event.request) {
        delete event.request.data
        delete event.request.query_string
        delete event.request.cookies
      }
      return event
    }
  })
}
