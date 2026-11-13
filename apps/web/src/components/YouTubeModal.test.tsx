import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { i18nReady } from '@/i18n'

await i18nReady

import YouTubeModal from '@/components/YouTubeModal'

describe('YouTubeModal', () => {
  afterEach(cleanup)

  it('warns that YouTube receives the IP and links to Privacy', () => {
    render(
      <MemoryRouter>
        <YouTubeModal youtubeId="abc123" description="Crash test" onClose={() => {}} />
      </MemoryRouter>
    )
    expect(screen.getByText(/YouTube/, { selector: 'span' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /details/i }).getAttribute('href')).toBe('/privacy#privacy-thirdParty')
  })
})
