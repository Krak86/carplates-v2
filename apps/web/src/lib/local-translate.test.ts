import { describe, it, expect } from 'vitest'

import { detectOptions, opusSteps } from './local-translate'

describe('opusSteps', () => {
  it('pivots through English when neither side is English', () => {
    expect(opusSteps('nl', 'ua')).toEqual(['nl-en', 'en-uk'])
    expect(opusSteps('nl', 'ru')).toEqual(['nl-en', 'en-ru'])
  })

  it('is one step from or to English, and none for the same language', () => {
    expect(opusSteps('en', 'ua')).toEqual(['en-uk'])
    expect(opusSteps('nl', 'en')).toEqual(['nl-en'])
    expect(opusSteps('en', 'en')).toEqual([])
  })
})

describe('detectOptions', () => {
  it('offers the OPUS route with its download size and no built-in translator in a plain browser', async () => {
    const options = await detectOptions('nl', 'ua')
    expect(options.map(o => o.id)).toEqual(['opus'])
    expect(options[0]).toMatchObject({ status: 'download', sizeMb: 215 })
  })
})
