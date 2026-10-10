import { MOT_GROUP_CODES } from '@carplates/shared'
import { describe, it, expect } from 'vitest'

import { buildReasonIndex, groupCodeOf, type MotReasonInfo } from './mot-lookup.js'

describe('groupCodeOf', () => {
  it('maps the car, van and motorcycle tree names of one area to one code', () => {
    expect(groupCodeOf('Brakes')).toBe('brakes')
    expect(groupCodeOf('Motorcycle brakes')).toBe('brakes')
    expect(groupCodeOf('Lamps, Reflectors and Electrical Equipment')).toBe('lamps')
    expect(groupCodeOf('Motorcycle lighting and signalling')).toBe('lamps')
    expect(groupCodeOf("Driver's View of the Road")).toBe('visibility')
    expect(groupCodeOf('Noise, emissions and leaks')).toBe('exhaust')
    expect(groupCodeOf('Seat belts and supplementary restraint systems')).toBe('seatbelts')
  })

  it('keeps tyres and wheels apart and sends the rest to other', () => {
    expect(groupCodeOf('Tyres')).toBe('tyres')
    expect(groupCodeOf('Road Wheels')).toBe('wheels')
    expect(groupCodeOf('Non-component advisories')).toBe('other')
  })
})

const info = (rfrId: number, over: Partial<MotReasonInfo> = {}): MotReasonInfo => ({
  rfrId,
  group: 'brakes',
  item: 'Brake pads',
  category: 'Major',
  desc: 'less than 1.5 mm thick',
  advisory: 'wearing thin',
  ...over
})

describe('buildReasonIndex', () => {
  it('merges rfr ids with the same wording into one reason code', () => {
    const lookup = new Map([
      [10, info(10)],
      [11, info(11)],
      [12, info(12, { item: 'Brake discs', desc: 'worn', category: 'Dangerous' })]
    ])
    const idx = buildReasonIndex(lookup, MOT_GROUP_CODES)
    expect(idx.reasons).toHaveLength(2)
    expect(idx.reasonOf[10]).toBe(idx.reasonOf[11])
    expect(idx.reasonOf[12]).not.toBe(idx.reasonOf[10])
    expect(idx.reasons[idx.reasonOf[10]!]!.code).toBe('brakes/brake-pads/less-than-1-5-mm-thick')
    expect(idx.groupOf[10]).toBe(MOT_GROUP_CODES.indexOf('brakes'))
  })

  it('takes severity from the lookup category, per rfr id', () => {
    const idx = buildReasonIndex(
      new Map([
        [5, info(5, { category: 'Dangerous' })],
        [6, info(6)]
      ]),
      MOT_GROUP_CODES
    )
    expect(idx.dangerousOf[5]).toBe(1)
    expect(idx.dangerousOf[6]).toBe(0)
  })

  it('falls back to the advisory text for a reason with no fault wording', () => {
    const idx = buildReasonIndex(
      new Map([[7, info(7, { desc: '', advisory: 'Nail in tyre', group: 'other', item: 'Non-component advisories' })]]),
      MOT_GROUP_CODES
    )
    expect(idx.reasons[0]!.code).toBe('other/non-component-advisories/nail-in-tyre')
  })

  it('leaves unknown rfr ids at -1', () => {
    const idx = buildReasonIndex(new Map([[3, info(3)]]), MOT_GROUP_CODES)
    expect(idx.reasonOf[2]).toBe(-1)
  })
})
