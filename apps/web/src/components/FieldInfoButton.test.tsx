import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StatsFieldResponse } from '@carplates/shared'

import { i18nReady } from '@/i18n'
import FieldInfoButton from '@/components/FieldInfoButton'
import { getStatsField } from '@/lib/api'

await i18nReady

vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  getStatsField: vi.fn()
}))

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const bodyRows: StatsFieldResponse = [{ value: 'СЕДАН', totalRows: 7, distinctPlates: 7, distinctVins: 6 }]
const fuelRows: StatsFieldResponse = [
  { value: 'БЕНЗИН', totalRows: 6, distinctPlates: 6, distinctVins: 5 },
  { value: null, totalRows: 4, distinctPlates: 3, distinctVins: 3 }
]

describe('FieldInfoButton', () => {
  beforeEach(() => {
    vi.mocked(getStatsField).mockImplementation(async dimension => (dimension === 'fuel' ? fuelRows : bodyRows))
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('stays open through the grace period after the pointer leaves, then closes', async () => {
    renderWithProviders(<FieldInfoButton dimension="fuel" current="БЕНЗИН" />)
    const button = screen.getByRole('button', { name: 'Show Fuel breakdown' })

    fireEvent.mouseEnter(button.parentElement as HTMLElement)
    await waitFor(() => expect(screen.getByRole('tooltip')).toBeInTheDocument())

    vi.useFakeTimers()
    fireEvent.mouseLeave(button.parentElement as HTMLElement)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(999))
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(2))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('re-entering before the grace period elapses cancels the close', async () => {
    renderWithProviders(<FieldInfoButton dimension="fuel" current="БЕНЗИН" />)
    const button = screen.getByRole('button', { name: 'Show Fuel breakdown' })

    fireEvent.mouseEnter(button.parentElement as HTMLElement)
    await waitFor(() => expect(screen.getByRole('tooltip')).toBeInTheDocument())

    vi.useFakeTimers()
    fireEvent.mouseLeave(button.parentElement as HTMLElement)
    act(() => vi.advanceTimersByTime(999))
    fireEvent.mouseEnter(button.parentElement as HTMLElement)
    act(() => vi.advanceTimersByTime(2000))

    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })

  it('merges unknown/absent fuel values into one row', async () => {
    renderWithProviders(<FieldInfoButton dimension="fuel" current="БЕНЗИН" />)
    fireEvent.click(screen.getByRole('button', { name: 'Show Fuel breakdown' }))

    await waitFor(() => expect(screen.getByText('Not specified')).toBeInTheDocument())
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('lists a plain, icon-less breakdown for a dimension without a known/unknown split', async () => {
    renderWithProviders(<FieldInfoButton dimension="body" current="СЕДАН" />)
    fireEvent.click(screen.getByRole('button', { name: 'Show Body type breakdown' }))

    await waitFor(() => expect(screen.getByText('СЕДАН')).toBeInTheDocument())
    expect(screen.getByText('7')).toBeInTheDocument()
  })
})
