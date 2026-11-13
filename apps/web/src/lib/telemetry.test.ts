import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { init, capture } = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn() }))

vi.mock('posthog-js', () => ({ default: { init, capture } }))

async function load(): Promise<typeof import('./telemetry')> {
  vi.resetModules()
  return import('./telemetry')
}

describe('telemetry', () => {
  beforeEach(() => {
    init.mockClear()
    capture.mockClear()
    vi.stubEnv('VITE_ENABLE_TELEMETRY', 'true')
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test')
    vi.stubEnv('VITE_SENTRY_DSN', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('starts PostHog cookieless with no autocapture, replay or surveys', async () => {
    const { initTelemetry } = await load()
    const started = initTelemetry()
    window.dispatchEvent(new Event('pointerdown'))
    await started

    expect(init).toHaveBeenCalledTimes(1)
    const [key, options] = init.mock.calls[0] ?? []
    expect(key).toBe('phc_test')
    expect(options).toMatchObject({
      cookieless_mode: 'always',
      persistence: 'memory',
      autocapture: false,
      disable_session_recording: true,
      disable_surveys: true,
      capture_dead_clicks: false,
      capture_heatmaps: false,
      capture_performance: false,
      person_profiles: 'identified_only',
      capture_pageview: 'history_change'
    })
  })

  it('does not load PostHog when telemetry is off', async () => {
    vi.stubEnv('VITE_ENABLE_TELEMETRY', 'false')
    const { initTelemetry } = await load()
    await initTelemetry()
    expect(init).not.toHaveBeenCalled()
  })

  it('flushes events captured before init', async () => {
    const { initTelemetry, capture: track } = await load()
    track('early', { a: 1 })
    const started = initTelemetry()
    window.dispatchEvent(new Event('pointerdown'))
    await started
    expect(capture).toHaveBeenCalledWith('early', { a: 1 })
  })
})
