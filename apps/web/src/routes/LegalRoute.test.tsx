import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { i18nReady } from '@/i18n'
import LegalRoute from '@/routes/LegalRoute'

await i18nReady

describe('LegalRoute', () => {
  afterEach(cleanup)

  it('privacy page shows the controller, the cookie table and the retention table', () => {
    render(
      <MemoryRouter>
        <LegalRoute doc="privacy" />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { name: 'Who is responsible' })).toBeTruthy()
    expect(screen.getAllByRole('table')).toHaveLength(2)
    for (const cookie of ['carsua_sid', 'carsua_did', 'cf_clearance', 'g_state', 'stel_ssid']) {
      expect(screen.getByText(cookie)).toBeTruthy()
    }
    expect(screen.getByText('Backups')).toBeTruthy()
  })

  it('terms page has no tables', () => {
    render(
      <MemoryRouter>
        <LegalRoute doc="terms" />
      </MemoryRouter>
    )
    expect(screen.queryByRole('table')).toBeNull()
  })
})
