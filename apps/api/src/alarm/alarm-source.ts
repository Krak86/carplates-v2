import type { UpstreamRegionAlerts, UpstreamRegionNode } from '@carplates/shared'

export const ALARM_SOURCE = Symbol('ALARM_SOURCE')

/** Upstream answered 429: do not call again for `retryAfterSeconds`. */
export class AlarmRateLimitedError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super(`rate limited, retry after ${retryAfterSeconds}s`)
  }
}

/** Where the active alerts come from. The feature is built on this, so the provider can be swapped (docs/alarm-plan.md). */
export type AlarmSource = {
  /** False when there is nothing to poll (no key, no mock). */
  readonly enabled: boolean
  fetchAlerts(): Promise<UpstreamRegionAlerts[]>
  /** The State > District > Community tree; changes rarely. */
  fetchRegions(): Promise<UpstreamRegionNode[]>
}
