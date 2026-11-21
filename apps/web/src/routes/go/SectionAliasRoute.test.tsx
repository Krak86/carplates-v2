import { cleanup, render } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SectionAliasRoute from '@/routes/go/SectionAliasRoute'

vi.mock('@/lib/telemetry', () => ({ capture: vi.fn() }))

function Where() {
  const { pathname, search } = useLocation()
  return <div data-testid="where">{pathname + search}</div>
}

const open = (url: string): string => {
  const { getByTestId } = render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/s/:target/:section" element={<SectionAliasRoute />} />
        <Route path="/s/:section" element={<SectionAliasRoute />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  )
  return getByTestId('where').textContent ?? ''
}

describe('SectionAliasRoute', () => {
  afterEach(cleanup)

  it('redirects to /<target>?section=… and keeps the rest of the query', () => {
    expect(open('/s/AA1234BB/vin?lang=en&tab=x')).toBe('/AA1234BB?lang=en&tab=x&section=vin')
  })

  it('drops an unknown section', () => {
    expect(open('/s/alarms/nope?lang=en')).toBe('/alarms?lang=en')
  })

  it('opens /alarms from the short /s/<section> form and sends an unknown one home', () => {
    expect(open('/s/losses?lang=en')).toBe('/alarms?lang=en&section=losses')
    cleanup()
    expect(open('/s/nope')).toBe('/')
  })
})
