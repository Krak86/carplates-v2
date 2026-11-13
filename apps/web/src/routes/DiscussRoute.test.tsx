import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { i18nReady } from '@/i18n'

await i18nReady

vi.mock('disqus-react', () => ({ DiscussionEmbed: (): ReactNode => <div data-testid="disqus" /> }))

describe('DiscussRoute', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
  })

  it('does not mount the Disqus embed before the click', async () => {
    // The short name is read at module load, so stub it before importing the route.
    vi.stubEnv('VITE_DISQUS_SHORT_NAME', 'test-shortname')
    vi.resetModules()
    const { default: DiscussRoute } = await import('@/routes/DiscussRoute')
    render(
      <MemoryRouter>
        <DiscussRoute />
      </MemoryRouter>
    )
    expect(screen.queryByTestId('disqus')).toBeNull()
    expect(screen.getByText(/Disqus sets cookies/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByTestId('disqus')).toBeTruthy()
  })
})
