import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import ReadGuideLink from '@/components/ReadGuideLink'
import { i18nReady } from '@/i18n'
import { FUEL_PATH, GUIDE_META, GUIDE_PATHS, readHref, SIZES_PATH } from '@/routes/read/links'

await i18nReady

const renderLink = (ui: React.ReactNode): void => {
  render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('ReadGuideLink', () => {
  it('links to the guide and names it', () => {
    renderLink(<ReadGuideLink guide={FUEL_PATH} />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe(FUEL_PATH)
    expect(link.textContent).toContain('Guide:')
  })

  it('follows a deep link when given one', () => {
    const href = readHref.sizes({ cls: 'C' })
    renderLink(<ReadGuideLink guide={SIZES_PATH} href={href} />)
    expect(screen.getByRole('link').getAttribute('href')).toBe(href)
  })
})

describe('GUIDE_META', () => {
  it('has an entry for every guide path', () => {
    expect(Object.keys(GUIDE_META).sort()).toEqual([...GUIDE_PATHS].sort())
  })
})
