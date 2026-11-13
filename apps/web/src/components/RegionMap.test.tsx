import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { i18nReady } from '@/i18n'
import { REGION_CENTERS } from '@/lib/region-centers'

await i18nReady

import RegionMap from '@/components/RegionMap'

const region = Object.keys(REGION_CENTERS)[0] ?? ''

describe('RegionMap', () => {
  afterEach(cleanup)

  it('renders no iframe before the click, then loads the OpenStreetMap embed', () => {
    const { container } = render(<RegionMap region={region} />)
    expect(container.querySelector('iframe')).toBeNull()

    fireEvent.click(screen.getByRole('button'))
    expect(container.querySelector('iframe')?.getAttribute('src')).toContain('openstreetmap.org')
  })

  it('renders nothing for an unknown region', () => {
    const { container } = render(<RegionMap region="nope" />)
    expect(container.firstChild).toBeNull()
  })
})
