import { afterEach, describe, expect, it } from 'vitest'

import { i18nReady } from '@/i18n'
import { buildShareUrl } from '@/lib/share-section'

await i18nReady

describe('buildShareUrl', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('writes a single-segment page as a /s/<page>/<section> alias', () => {
    window.history.replaceState(null, '', '/AA1234BB')
    const url = new URL(buildShareUrl('vin', 'x'))
    expect(url.pathname).toBe('/s/AA1234BB/vin')
    expect(url.searchParams.get('tab')).toBe('x')
    expect(url.searchParams.get('lang')).toBeTruthy()
    expect(url.searchParams.has('section')).toBe(false)
  })

  it('writes an /alarms section as /s/<section>', () => {
    window.history.replaceState(null, '', '/alarms')
    expect(new URL(buildShareUrl('losses')).pathname).toBe('/s/losses')
  })

  it('keeps ?section= on a multi-segment page', () => {
    window.history.replaceState(null, '', '/cars/toyota/camry')
    const url = new URL(buildShareUrl('model3d'))
    expect(url.pathname).toBe('/cars/toyota/camry')
    expect(url.searchParams.get('section')).toBe('model3d')
  })
})
