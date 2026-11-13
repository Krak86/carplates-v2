import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { i18nReady } from '@/i18n'

await i18nReady

import SharedLayoutPrompt from '@/components/SharedLayoutPrompt'
import { useLiveBackgroundStore } from '@/store/live-background-store'

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <SharedLayoutPrompt />
    </MemoryRouter>
  )
}

describe('SharedLayoutPrompt', () => {
  beforeEach(() => useLiveBackgroundStore.setState({ mode: 'images' }))
  afterEach(cleanup)

  it('asks before a shared map layout starts, and only the click turns it on', () => {
    const { container } = renderAt('/relax?layout=map')
    expect(container.textContent).toContain('Google')
    expect(useLiveBackgroundStore.getState().mode).toBe('images')

    fireEvent.click(screen.getAllByRole('button')[0]!)
    expect(useLiveBackgroundStore.getState().mode).toBe('map')
    expect(container.firstChild).toBeNull()
  })

  it('dismissing keeps the photos', () => {
    const { container } = renderAt('/relax?layout=earth&stream=M3HKLzjvKPc')
    fireEvent.click(screen.getAllByRole('button')[1]!)
    expect(useLiveBackgroundStore.getState().mode).toBe('images')
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing without a layout link, or for the alarm layer', () => {
    expect(renderAt('/relax').container.firstChild).toBeNull()
    cleanup()
    expect(renderAt('/relax?layout=alarm').container.firstChild).toBeNull()
  })
})
