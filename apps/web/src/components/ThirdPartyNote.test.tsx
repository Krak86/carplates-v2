import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { i18nReady } from '@/i18n'

await i18nReady

import ThirdPartyNote from '@/components/ThirdPartyNote'

describe('ThirdPartyNote', () => {
  afterEach(cleanup)

  it('names the provider and links to the Privacy third-party section', () => {
    render(
      <MemoryRouter>
        <ThirdPartyNote provider="OpenStreetMap" />
      </MemoryRouter>
    )
    expect(screen.getByText(/OpenStreetMap/)).toBeTruthy()
    expect(screen.getByRole('link').getAttribute('href')).toBe('/privacy#privacy-thirdParty')
  })

  it('mentions cookies when the provider sets them', () => {
    const { container } = render(
      <MemoryRouter>
        <ThirdPartyNote provider="Disqus" cookies />
      </MemoryRouter>
    )
    expect(container.textContent).toMatch(/Disqus.*cookies/i)
  })
})
