import { describe, expect, it } from 'vitest'

import { compareShareParams, parseSection, parseSizeParams, readableQuery } from './compare-share'

describe('compareShareParams', () => {
  it('keeps both cars, drops other state, adds the section, tabs and language', () => {
    const current = new URLSearchParams('a=plate:AA1234BB&b=m:bmw/3series/2015&view=top&section=bars&utm=x')
    const out = compareShareParams(current, 'size', { view: 'front', layout: 'beside', style: undefined }, 'ua')
    expect(readableQuery(out)).toBe(
      'a=plate:AA1234BB&b=m:bmw/3series/2015&section=size&view=front&layout=beside&lang=ua'
    )
  })

  it('leaves an empty slot out', () => {
    const out = compareShareParams(new URLSearchParams('a=vin:ABC'), 'table', { diff: '1' }, 'en')
    expect(out.get('b')).toBeNull()
    expect(out.get('diff')).toBe('1')
  })
})

describe('parseSizeParams', () => {
  it('reads valid tabs and a clamped divider', () => {
    expect(parseSizeParams(new URLSearchParams('view=all&layout=inplace&style=blueprint&split=140'))).toEqual({
      view: 'all',
      layout: 'inplace',
      style: 'blueprint',
      split: 100
    })
  })

  it('ignores unknown values', () => {
    expect(parseSizeParams(new URLSearchParams('view=diagonal&layout=x&style=neon&split=abc'))).toEqual({
      view: undefined,
      layout: undefined,
      style: undefined
    })
  })
})

describe('parseSection', () => {
  it('accepts only our sections', () => {
    expect(parseSection(new URLSearchParams('section=size'))).toBe('size')
    expect(parseSection(new URLSearchParams('section=wiki'))).toBeUndefined()
  })
})
