import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { PlateLookupResponse } from '@carplates/shared'

import '@/i18n'
import ResultCard from '@/components/ResultCard'
import { plateHistory } from '@/lib/api'

vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  plateHistory: vi.fn()
}))

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

const data: PlateLookupResponse = {
  plate: 'ВЕ7116АА',
  region: 'Миколаївська область',
  historyCount: 2,
  current: {
    plate: 'ВЕ7116АА',
    person: 'P',
    regAddrKoatuu: '4823355100',
    operCode: 100,
    operName: 'ПЕРВИННА РЕЄСТРАЦIЯ',
    dReg: '2018-05-11',
    depCode: '1234',
    dep: 'ТСЦ 1234',
    brand: 'TOYOTA',
    model: 'CAMRY',
    vin: '4T1BF1FK5CU000001',
    makeYear: 2018,
    color: 'ЧОРНИЙ',
    kind: 'ЛЕГКОВИЙ',
    body: 'СЕДАН',
    purpose: 'ЗАГАЛЬНИЙ',
    fuel: 'БЕНЗИН',
    capacity: 2494,
    powerKwt: null,
    ownWeight: 1490,
    totalWeight: 1990,
    plateInferred: false
  }
}

describe('ResultCard', () => {
  it('shows the summary and hides detail rows until expanded', () => {
    renderWithProviders(<ResultCard data={data} />)
    expect(screen.getByText(/TOYOTA CAMRY/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ВЕ7116АА' })).toHaveAttribute('href', '/ВЕ7116АА')
    expect(screen.getByText(/Миколаївська область/)).toBeInTheDocument()

    const detailsButton = screen.getByRole('button', { name: 'More details' })
    expect(detailsButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('4T1BF1FK5CU000001').closest('[aria-hidden]')).toHaveAttribute('aria-hidden', 'true')

    fireEvent.click(detailsButton)
    expect(detailsButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('4T1BF1FK5CU000001').closest('[aria-hidden]')).toHaveAttribute('aria-hidden', 'false')
  })

  it('shows power in kW instead of capacity for a pure EV, and the inferred-plate badge', () => {
    const ev: PlateLookupResponse = {
      ...data,
      current: { ...data.current, capacity: null, powerKwt: 150, plateInferred: true }
    }
    renderWithProviders(<ResultCard data={ev} />)
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('plate reconstructed from VIN')).toBeInTheDocument()
  })

  it('fetches and shows registration history when the history button is clicked', async () => {
    vi.mocked(plateHistory).mockResolvedValue({
      plate: data.plate,
      region: data.region,
      actions: [{ ...data.current, dReg: '2018-05-11', operCode: 100 }]
    })
    renderWithProviders(<ResultCard data={data} />)

    fireEvent.click(screen.getByRole('button', { name: 'Registration history' }))

    expect(plateHistory).toHaveBeenCalledWith(data.plate)
    await waitFor(() => expect(screen.getByText('2018-05-11')).toBeInTheDocument())
  })
})
