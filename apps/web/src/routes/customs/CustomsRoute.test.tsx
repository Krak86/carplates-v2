import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { i18nReady } from '@/i18n'
import CustomsRoute from '@/routes/customs/CustomsRoute'

await i18nReady

function renderAt(url: string): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <CustomsRoute />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('CustomsRoute', () => {
  it('shows the petrol preset result without params', () => {
    renderAt('/customs')
    expect(screen.getByDisplayValue('1600')).toBeTruthy()
    expect(screen.getByText('€ 480')).toBeTruthy()
  })

  it('computes on load from the link: an EV with its battery excise and VAT', () => {
    renderAt('/customs?fuel=ev&value=15000&kwh=60&year=2023')
    expect(screen.getByDisplayValue('60')).toBeTruthy()
    expect(screen.getByText('€ 60')).toBeTruthy()
    expect(screen.getByText(/^€ 3.?012$/)).toBeTruthy()
  })

  it('asks for the missing engine size instead of guessing', () => {
    renderAt('/customs?fuel=petrol&value=8000&year=2019')
    expect(screen.getByText(/too low/)).toBeTruthy()
  })

  it('flags a hybrid as an estimate', () => {
    renderAt('/customs?fuel=hybrid&value=9000&cc=1800&year=2019')
    expect(screen.getByText(/charged like a petrol car/)).toBeTruthy()
  })
})
