import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { i18nReady } from '@/i18n'
import CustomsCalcLinks from '@/routes/read/CustomsCalcLinks'

await i18nReady

describe('CustomsCalcLinks', () => {
  it('links the calculator and its three preset examples', () => {
    render(
      <MemoryRouter>
        <CustomsCalcLinks />
      </MemoryRouter>
    )
    const hrefs = screen.getAllByRole('link').map(a => a.getAttribute('href'))
    expect(hrefs[0]).toBe('/customs')
    expect(hrefs).toHaveLength(4)
    expect(hrefs.slice(1).every(h => h?.startsWith('/customs?fuel='))).toBe(true)
  })
})
