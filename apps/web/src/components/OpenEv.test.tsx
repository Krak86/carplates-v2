import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { OpenEvResponse } from '@carplates/shared'

import ElectricLink from '@/components/ElectricLink'
import OpenEv from '@/components/OpenEv'
import { i18nReady } from '@/i18n'
import { getOpenEv } from '@/lib/api'

await i18nReady

vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  getOpenEv: vi.fn()
}))

const variant = {
  variant: 'LR',
  powertrain: 'bev' as const,
  releaseYear: 2019,
  batteryKwh: 74,
  consumptionKwh100: 16.1,
  acMaxKw: 11,
  acPhases: 3,
  acPorts: ['type2'],
  dcMaxKw: 149,
  dcPorts: ['ccs']
}
const response: OpenEvResponse = {
  brand: 'TESLA',
  model: 'MODEL 3',
  match: {
    makeName: 'Tesla',
    modelName: 'Model 3',
    how: 'exact',
    crossMake: false,
    variants: [variant, { ...variant, variant: 'SR+', batteryKwh: 50 }]
  }
}

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('OpenEv', () => {
  afterEach(() => vi.clearAllMocks())

  it('shows only the variant count until the header is clicked', async () => {
    vi.mocked(getOpenEv).mockResolvedValue(response)
    renderWithProviders(<OpenEv brand="TESLA" model="MODEL 3" year={2019} fuel="ЕЛЕКТРО" />)

    expect(await screen.findByText('(2)')).toBeInTheDocument()
    expect(screen.queryByText('Usable battery')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show charging data' }))
    expect(screen.getAllByText('Usable battery')).toHaveLength(2)
    expect(screen.getByText('74 kWh')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hide charging data' }))
    expect(screen.queryByText('Usable battery')).not.toBeInTheDocument()
  })

  it('renders nothing for a combustion car and does not fetch', async () => {
    vi.mocked(getOpenEv).mockResolvedValue(response)
    renderWithProviders(<OpenEv brand="TESLA" model="MODEL 3" year={2019} fuel="БЕНЗИН" />)
    await Promise.resolve()
    expect(screen.queryByText('(2)')).not.toBeInTheDocument()
    expect(getOpenEv).not.toHaveBeenCalled()
  })

  it('the basic-data link opens a mounted block', async () => {
    vi.mocked(getOpenEv).mockResolvedValue(response)
    renderWithProviders(
      <>
        <ElectricLink brand="TESLA" model="MODEL 3" fuel="ЕЛЕКТРО" />
        <OpenEv brand="TESLA" model="MODEL 3" year={2019} fuel="ЕЛЕКТРО" />
      </>
    )
    await waitFor(() => expect(screen.getByText('(2)')).toBeInTheDocument())

    // The first match is the 🔌 link (rendered first); the header pill carries the same label.
    fireEvent.click(screen.getAllByRole('button', { name: 'Show charging data' })[0]!)
    await waitFor(() => expect(screen.getAllByText('Usable battery')).toHaveLength(2))
  })
})
