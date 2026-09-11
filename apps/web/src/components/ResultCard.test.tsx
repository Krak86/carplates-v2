import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { PlateLookupResponse } from '@carplates/shared'

import '@/i18n'
import ResultCard from '@/components/ResultCard'

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
    render(
      <MemoryRouter>
        <ResultCard data={data} />
      </MemoryRouter>
    )
    expect(screen.getByText(/TOYOTA CAMRY/)).toBeInTheDocument()
    expect(screen.getByText(/ВЕ7116АА, Миколаївська область/)).toBeInTheDocument()
    expect(screen.queryByText('4T1BF1FK5CU000001')).not.toBeInTheDocument()
  })

  it('shows power in kW instead of capacity for a pure EV, and the inferred-plate badge', () => {
    const ev: PlateLookupResponse = {
      ...data,
      current: { ...data.current, capacity: null, powerKwt: 150, plateInferred: true }
    }
    render(
      <MemoryRouter>
        <ResultCard data={ev} />
      </MemoryRouter>
    )
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('plate reconstructed from VIN')).toBeInTheDocument()
  })
})
