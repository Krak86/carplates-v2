import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { i18nReady } from '@/i18n'

await i18nReady

const api = vi.hoisted(() => ({ getContactConfig: vi.fn(), getSession: vi.fn() }))
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  ...api
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
  beforeEach(() => {
    api.getContactConfig.mockReset().mockResolvedValue({ enabled: true, turnstileSiteKey: null })
    api.getSession.mockReset().mockResolvedValue({ user: null })
  })

  it('asks an anonymous sender for a confirmation code first', async () => {
    renderForm()
    expect(await screen.findByRole('button', { name: /confirmation code|код підтвердження/i })).toBeTruthy()
  })

  it('lets a signed-in user send directly with their account email', async () => {
    api.getSession.mockResolvedValue({ user: { id: 'u1', email: 'member@example.com', role: 'user' } })
    renderForm()
    const email = (await screen.findByDisplayValue('member@example.com')) as HTMLInputElement
    expect(email.readOnly).toBe(true)
    expect(await screen.findByRole('button', { name: /^(send|надіслати)$/i })).toBeTruthy()
  })

  it('shows a notice instead of the form when it is disabled', async () => {
    api.getContactConfig.mockResolvedValue({ enabled: false, turnstileSiteKey: null })
    renderForm()
    expect(await screen.findByText(/not available|недоступна/i)).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
