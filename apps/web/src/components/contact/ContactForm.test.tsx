import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { i18nReady } from '@/i18n'

const getContactConfig = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  getContactConfig
}))

import ContactForm from '@/components/contact/ContactForm'

function renderForm(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ContactForm />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ContactForm', () => {
  beforeEach(async () => {
    await i18nReady
    getContactConfig.mockReset()
  })

  it('shows the form when the API says it is enabled', async () => {
    getContactConfig.mockResolvedValue({ enabled: true, turnstileSiteKey: null })
    renderForm()
    expect(await screen.findByLabelText(/message|повідомлення/i)).toBeTruthy()
  })

  it('shows a notice instead of the form when it is disabled', async () => {
    getContactConfig.mockResolvedValue({ enabled: false, turnstileSiteKey: null })
    renderForm()
    expect(await screen.findByText(/not available|недоступна/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /send|надіслати/i })).toBeNull()
  })
})
