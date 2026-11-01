import { describe, expect, it } from 'vitest'

import {
  AUCTION_GROUPS,
  PROZORRO_STATUS_LABELS,
  auctionGroup,
  auctionLotSchema,
  prozorroAuctionUrl,
  prozorroDocumentUrl,
  prozorroStatusLabel
} from './auctions.js'

const SETAM_LOT = {
  lotNo: 100,
  proceedingNo: null,
  status: 'Торги відбулися',
  category: 'Легкові автомобілі',
  region: null,
  startPrice: 1,
  salePrice: 2,
  sold: true,
  year: null,
  make: null,
  model: null,
  title: 't',
  plate: null,
  vin: null,
  matchedBy: 'plate',
  firstSeenAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
}

describe('auction lot contract', () => {
  it('still accepts a SETAM lot saved before Prozorro.Sale (no id, source, group or seller fields)', () => {
    expect(auctionLotSchema.safeParse(SETAM_LOT).success).toBe(true)
  })

  it('accepts a Prozorro lot without a lot number', () => {
    const lot = {
      ...SETAM_LOT,
      lotNo: null,
      id: 'prozorro:BRE001-UA-1',
      source: 'prozorro',
      group: 'customs',
      photos: []
    }
    expect(auctionLotSchema.safeParse(lot).success).toBe(true)
  })
})

describe('auction groups', () => {
  it('SETAM lots are their own group, Prozorro lots follow their seller kind', () => {
    expect(auctionGroup('setam', null, null)).toBe('setam')
    expect(auctionGroup('prozorro', 'customs', 'basicSell-english')).toBe('customs')
    expect(auctionGroup('prozorro', 'bank', 'commercialSell-english')).toBe('bank')
    expect(auctionGroup('prozorro', 'bankruptcy', 'bankRuptcy-dutch')).toBe('bankruptcy')
  })

  it('small privatization is told apart by the selling method, unknown kinds fall back to state', () => {
    expect(auctionGroup('prozorro', 'state', 'smallPrivatization-english')).toBe('privatization')
    expect(auctionGroup('prozorro', 'state', 'alienation-english')).toBe('state')
    expect(auctionGroup('prozorro', null, null)).toBe('state')
    expect(auctionGroup('prozorro', 'something-new', 'basicSell-english')).toBe('state')
  })

  it('every group value it returns is a listed group', () => {
    const kinds = ['bank', 'customs', 'bankruptcy', 'arma', 'state', 'commercial', 'lease', null]
    for (const kind of kinds) expect(AUCTION_GROUPS).toContain(auctionGroup('prozorro', kind, 'basicSell-english'))
  })
})

describe('prozorro status and links', () => {
  it('maps the feed statuses to the SETAM wording, open ones to the open status', () => {
    expect(prozorroStatusLabel('active_tendering')).toBe('Реєстрація учасників')
    expect(prozorroStatusLabel('active_rectification')).toBe('Реєстрація учасників')
    expect(prozorroStatusLabel('active_qualification')).toBe('Реєстрація учасників')
    expect(prozorroStatusLabel('complete')).toBe('Торги відбулися')
    expect(prozorroStatusLabel('unsuccessful')).toBe('Торги не відбулися')
    expect(prozorroStatusLabel('cancelled')).toBe('Торги припинено')
    expect(prozorroStatusLabel('pending_payment')).toBe('Очікування сплати')
    expect(prozorroStatusLabel('active_awarded')).toBe('Складання акту')
    expect(prozorroStatusLabel('brand_new_status')).toBe('brand_new_status')
    expect(Object.keys(PROZORRO_STATUS_LABELS)).toHaveLength(8)
  })

  it('builds the public auction page with the full id and the document url', () => {
    expect(prozorroAuctionUrl('BRE001-UA-20260924-95103')).toBe(
      'https://prozorro.sale/auction/BRE001-UA-20260924-95103/'
    )
    expect(prozorroDocumentUrl('a'.repeat(32))).toBe(
      `https://procedure.prozorro.sale/api/documents/public/${'a'.repeat(32)}`
    )
  })
})
