import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LEGACY_COUNTRIES } from '@carplates/shared'

import Flag from '@/components/Flag'
import { countryLabel, FLAG_CODES, flagSlug } from '@/components/vin/helpers'

const FLAG_DIR = resolve(__dirname, '../../public/country-flags')

describe('flagSlug', () => {
  it('lowercases current countries and gives West Germany the German flag', () => {
    expect(flagSlug('CZ')).toBe('cz')
    expect(flagSlug('DE-FRG')).toBe('de')
  })

  it('has no file for former states or unknown codes', () => {
    for (const code of ['SU', 'CSHH', 'DD', 'YU', 'CSXX', 'XX']) expect(flagSlug(code)).toBeNull()
  })

  it('every listed flag has its SVG file', () => {
    for (const slug of FLAG_CODES) expect(existsSync(resolve(FLAG_DIR, `${slug}.svg`))).toBe(true)
  })
})

describe('countryLabel', () => {
  const t = (key: string): string => `t:${key}`

  it('uses Intl for current countries and the i18n key for former states', () => {
    expect(countryLabel('CZ', 'en', t)).toBe('Czechia')
    expect(countryLabel('SU', 'en', t)).toBe('t:country.SU')
    expect(countryLabel('DE-FRG', 'ua', t)).toBe('t:country.DE-FRG')
  })
})

describe('Flag', () => {
  it('renders a lazy img for a current country', () => {
    const { container } = render(<Flag code="JP" />)
    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toBe('/country-flags/jp.svg')
    expect(img?.getAttribute('alt')).toBe('')
  })

  it('draws every former state inline and West Germany from the German file', () => {
    for (const code of LEGACY_COUNTRIES.filter(c => c !== 'DE-FRG')) {
      const { container, unmount } = render(<Flag code={code} />)
      expect(container.querySelector('svg'), code).not.toBeNull()
      unmount()
    }
    const { container } = render(<Flag code="DE-FRG" />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/country-flags/de.svg')
  })

  it('names the flag only when asked, otherwise it is decorative', () => {
    expect(render(<Flag code="SU" label="USSR" />).getByRole('img', { name: 'USSR' })).toBeTruthy()
    const decorative = render(<Flag code="SU" />)
    expect(decorative.container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  it('renders nothing without a flag file', () => {
    expect(render(<Flag code="XX" />).container.firstChild).toBeNull()
  })
})
