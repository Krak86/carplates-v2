import { Injectable } from '@nestjs/common'
import * as Sentry from '@sentry/nestjs'

import { blockedOrigin, isNoise, sanitizeUri, toViolations } from './helpers.js'
import type { CspReportRequest, CspViolation } from './types.js'

@Injectable()
export class CspService {
  /** Forwards the real violations of a report to Sentry; returns how many were sent (noise is dropped). */
  record(request: CspReportRequest): number {
    const real = toViolations(request).filter(v => !isNoise(v))
    for (const v of real) this.capture(v)
    return real.length
  }

  private capture(v: CspViolation): void {
    const directive = v.directive || 'unknown'
    const blocked = sanitizeUri(v.blockedUrl)
    const origin = blockedOrigin(v.blockedUrl)
    Sentry.withScope(scope => {
      scope.setLevel('warning')
      scope.setTags({
        csp_directive: directive,
        csp_disposition: v.disposition || 'unknown',
        csp_blocked_origin: origin
      })
      scope.setContext('csp', {
        document: sanitizeUri(v.documentUrl),
        blocked,
        source: sanitizeUri(v.sourceFile),
        line: v.line,
        column: v.column,
        sample: v.sample.slice(0, 120)
      })
      // One Sentry issue per (directive, blocked origin), not per user or per page.
      scope.setFingerprint(['csp-violation', directive, origin])
      Sentry.captureMessage(`CSP ${directive} blocked ${blocked}`)
    })
  }
}
