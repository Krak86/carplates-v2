import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PlateLookupResponse } from '@carplates/shared'

import '@/i18n'
import ResultCard from '@/components/ResultCard'
import { decodeVin, plateHistory } from '@/lib/api'

vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  plateHistory: vi.fn(),
  decodeVin: vi.fn()
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
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows every registration field immediately, with no local expand step', () => {
    renderWithProviders(<ResultCard data={data} />)
    expect(screen.getByText(/TOYOTA CAMRY/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ВЕ7116АА' })).toHaveAttribute('href', '/ВЕ7116АА')
    expect(screen.getByText(/Миколаївська область/)).toBeInTheDocument()

    // Fields that used to live behind "show more" are now visible right away.
    expect(screen.getByText('ЛЕГКОВИЙ')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '4T1BF1FK5CU000001' })).toHaveAttribute('href', '/4T1BF1FK5CU000001')

    const detailsButton = screen.getByRole('button', { name: 'Registration / VIN history' })
    expect(detailsButton).toHaveAttribute('aria-expanded', 'false')
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

  it('fetches both plate-scoped and VIN-scoped history when a VIN is known', async () => {
    vi.mocked(plateHistory).mockResolvedValue({
      plate: data.plate,
      region: data.region,
      actions: [{ ...data.current, dReg: '2018-05-11', operCode: 100 }]
    })
    vi.mocked(decodeVin).mockResolvedValue({
      vin: data.current.vin as string,
      results: [{ variable: 'Make', value: 'TOYOTA' }],
      registry: {
        plate: data.plate,
        plateInferred: false,
        actions: [{ ...data.current, dReg: '2016-02-03', plate: 'АА1234ВЕ' }, data.current]
      }
    })
    renderWithProviders(<ResultCard data={data} />)

    fireEvent.click(screen.getByRole('button', { name: 'Registration / VIN history' }))

    expect(decodeVin).toHaveBeenCalledWith(data.current.vin)
    expect(plateHistory).toHaveBeenCalledWith(data.plate)

    // The plate-scoped section covers this plate's own history...
    await waitFor(() => expect(screen.getByText('2018-05-11')).toBeInTheDocument())
    // ...and the VIN-scoped section additionally surfaces an earlier plate the same VIN wore.
    await waitFor(() => expect(screen.getByText('2016-02-03')).toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'АА1234ВЕ' })).toHaveAttribute('href', '/АА1234ВЕ')
    expect(screen.getByText('Make')).toBeInTheDocument()
  })

  it('fetches only plate-scoped history when the current registration has no VIN', async () => {
    const noVin: PlateLookupResponse = { ...data, current: { ...data.current, vin: null } }
    vi.mocked(plateHistory).mockResolvedValue({
      plate: data.plate,
      region: data.region,
      actions: [{ ...noVin.current, dReg: '2018-05-11', operCode: 100 }]
    })
    renderWithProviders(<ResultCard data={noVin} />)

    fireEvent.click(screen.getByRole('button', { name: 'Registration / VIN history' }))

    expect(plateHistory).toHaveBeenCalledWith(data.plate)
    expect(decodeVin).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByText('2018-05-11')).toBeInTheDocument())
  })

  it('labels a plate-history row that belongs to a different vehicle (plate reassigned)', async () => {
    vi.mocked(plateHistory).mockResolvedValue({
      plate: data.plate,
      region: data.region,
      actions: [
        data.current,
        { ...data.current, dReg: '2014-01-10', brand: 'NISSAN', model: 'ROGUE', makeYear: 2014, vin: null }
      ]
    })
    renderWithProviders(<ResultCard data={data} />)

    fireEvent.click(screen.getByRole('button', { name: 'Registration / VIN history' }))

    await waitFor(() => expect(screen.getByText('2014-01-10')).toBeInTheDocument())
    expect(screen.getByText('NISSAN ROGUE (2014)')).toBeInTheDocument()
  })
})
