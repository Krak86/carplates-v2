import { describe, expect, it } from 'vitest'

import { readHref, shapeAnchor } from '@/routes/read/links'

describe('readHref', () => {
  it('links the body-types article, with or without a shape', () => {
    expect(readHref.bodyTypes()).toBe('/read/body-types')
    expect(readHref.bodyTypes('suv')).toBe('/read/body-types?shape=suv')
  })

  it('presets the size explorer and keeps the model to highlight', () => {
    expect(readHref.sizes()).toBe('/read/sizes#explorer')
    expect(readHref.sizes({ shape: 'suv', cls: 'J', brand: 'TOYOTA', model: 'RAV4' })).toBe(
      '/read/sizes?shape=suv&class=J&brand=TOYOTA&model=RAV4#explorer'
    )
  })

  it('skips empty params and encodes spaces', () => {
    expect(readHref.sizes({ shape: null, brand: 'LAND ROVER', model: '' })).toBe(
      '/read/sizes?brand=LAND+ROVER#explorer'
    )
  })

  it('names a shape card', () => {
    expect(shapeAnchor('hatch')).toBe('shape-hatch')
  })
})
