import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { i18nReady } from '@/i18n'
import { REGION_CENTERS } from '@/lib/region-centers'

await i18nReady

import RegionMap from '@/components/RegionMap'

const region = Object.keys(REGION_CENTERS)[0] ?? ''

describe('RegionMap', () => {
  afterEach(cleanup)

  it('renders no iframe before the click, then loads the OpenStreetMap embed', () => {
    const { container } = render(
      <MemoryRouter>
        <RegionMap region={region} />
      </MemoryRouter>
    )
    expect(container.querySelector('iframe')).toBeNull()
    expect(screen.getByRole('link').getAttribute('href')).toBe('/privacy#privacy-thirdParty')

    fireEvent.click(screen.getByRole('button'))
    expect(container.querySelector('iframe')?.getAttribute('src')).toContain('openstreetmap.org')
  })

  it('renders nothing for an unknown region', () => {
    const { container } = render(<RegionMap region="nope" />)
    expect(container.firstChild).toBeNull()
  })
})
