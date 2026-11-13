import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { i18nReady } from '@/i18n'

await i18nReady

vi.mock('@/components/use-nearby-location-actions', () => ({
  useNearbyLocationActions: () => ({
    status: 'ready',
    coords: { lat: 50, lng: 30 },
    handleRequestLocation: vi.fn()
  })
}))

import NearbyServices from '@/components/NearbyServices'

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <NearbyServices brand={null} />
    </MemoryRouter>
  )
}

describe('NearbyServices', () => {
  afterEach(cleanup)

  it('a shared link opens the section but loads no Google iframe until the button is clicked', () => {
    const { container } = renderAt('/X?section=nearby')
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.textContent).toMatch(/IP address to Google/)

    fireEvent.click(screen.getByRole('button', { name: /Google Maps/ }))
    expect(container.querySelector('iframe')?.getAttribute('src')).toContain('google.com')
  })

  it('opening the section by hand is the consent', () => {
    const { container } = renderAt('/X')
    expect(container.querySelector('iframe')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Show map/ }))
    expect(container.querySelector('iframe')).not.toBeNull()
  })
})
