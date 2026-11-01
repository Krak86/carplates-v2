import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { BANK_EDRPOU, findPlate, findVin, sellerKind, toProzorroAuctionInsert } from './prozorro-parse.js'

const NOW = new Date('2026-11-01T12:00:00Z')

/** Real feed records of Sep-Oct 2026 (byDateModified), trimmed: no contacts, bank accounts, buyers or most documents. */
const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', 'prozorro', `${name}.json`), 'utf8'))

function parseOk(name: string): Extract<ReturnType<typeof toProzorroAuctionInsert>, { ok: true }> {
  const res = toProzorroAuctionInsert(fixture(name), NOW)
  if (!res.ok) throw new Error(`${name}: rejected as ${res.reason}`)
  return res
}

describe('Prozorro vehicle auctions', () => {
  it('Renault 11GTA: structured props, plate from the title, seller and photos', () => {
    const { row, vehicles } = parseOk('renault-11gta')
    expect(vehicles).toBe(1)
    expect(row).toMatchObject({
      auctionId: 'BRE001-UA-20260924-95103',
      sellingMethod: 'bankRuptcy-english',
      status: 'unsuccessful',
      vin: 'VF611GTA000122884',
      plate: 'АА3895КК',
      make: 'RENAULT',
      model: '11GTA',
      year: 2003,
      color: 'білий',
      kilometrage: 988816,
      fuel: 'diesel',
      engineCc: 11929,
      damaged: false,
      value: 230160,
      minimalStep: 2301.6,
      guarantee: 23016,
      finalPrice: null,
      region: 'Київ',
      sellerName: 'Арбітражний керуючий БІЛИК ОЛЕКСАНДР АНАТОЛІЙОВИЧ',
      sellerEdrpou: '2604008837',
      sellerKind: 'bankruptcy',
      categories: ['transportSale'],
      directions: ['bankRuptcy'],
      auctionType: 'english'
    })
    expect(row.sourceModifiedAt).toEqual(new Date('2026-10-12T17:00:03.966Z'))
    expect(row.auctionStart).toEqual(new Date('2026-10-13T09:15:00Z'))
    expect(row.titleRaw).toContain('RENAULT 11GTA')
    expect(row.descriptionRaw).toContain('Справа про банкрутство')
  })

  it('keeps only image illustrations as photos (PDF and other documents are dropped)', () => {
    const { row } = parseOk('renault-11gta')
    expect(row.photoUrls).toHaveLength(3)
    expect(
      row.photoUrls.every((u: string) => u.startsWith('https://procedure.prozorro.sale/api/documents/public/'))
    ).toBe(true)
    const megane = parseOk('commercial-megane').row
    expect(megane.photoUrls).toHaveLength(3)
    const pdfIllustration = (fixture('commercial-megane') as { documents: { format: string }[] }).documents.find(
      d => !d.format.startsWith('image/')
    )
    expect(pdfIllustration).toBeDefined()
  })

  it('Volvo 460 half share: plate with a label inside the title, damage text kept', () => {
    const { row } = parseOk('volvo-460-half')
    expect(row).toMatchObject({
      vin: 'XLBLX183EMC210919',
      plate: '25134ОН',
      make: 'VOLVO',
      model: '460',
      year: 1991,
      damaged: true,
      condition: 'незадовільний',
      transmission: 'manual',
      fuel: 'gasoline',
      engineCc: 1800,
      kilometrage: 618956
    })
    expect(row.damageText).toContain('значна корозія кузова')
  })

  it('Dnipro Dokker: trailing space in the brand is trimmed, winning award becomes the final price', () => {
    const { row } = parseOk('dokker-dnipro')
    expect(row).toMatchObject({
      vin: 'VF18SRPL464232451',
      plate: 'АЕ8934ХС',
      make: 'RENAULT',
      model: 'DOKKER',
      year: 2019,
      status: 'complete',
      finalPrice: 248401,
      sellerKind: 'bankruptcy'
    })
  })

  it('trims and uppercases the VIN field (trailing space, "VIN " prefix)', () => {
    expect(parseOk('vin-trailing-space').row.vin).toBe('TMBAN2NE5KB007409')
    expect(findVin('TMBAN2NE5KB007409 ')).toBe('TMBAN2NE5KB007409')
    expect(findVin('VIN tmbce11u538711317 ')).toBe('TMBCE11U538711317')
  })

  it('folds Cyrillic look-alikes in a VIN and refuses I / O / Q and non-VIN chassis numbers', () => {
    expect(findVin('ХТН27520030060625')).toBe('XTH27520030060625')
    expect(findVin('TMBCG21U54289470I')).toBeNull()
    expect(findVin('шасі 165463/4100G033754')).toBeNull()
    expect(findVin('Y7D322130X1007697270500X0006426')).toBeNull()
    expect(findVin('Автомобільнийзасіб')).toBeNull()
  })

  it('commercial lot without itemProps: VIN and plate come from the item text', () => {
    const { row } = parseOk('commercial-megane')
    expect(row).toMatchObject({
      vin: 'VF1RFB00356373036',
      plate: 'СВ3534ЕА',
      make: 'RENAULT',
      model: 'MEGANE',
      year: 2015,
      kilometrage: null,
      damaged: null,
      sellerKind: 'commercial',
      region: 'Чернігівська область'
    })
  })

  it('does not read an engine volume as a plate ("1896 см")', () => {
    const { row } = parseOk('skoda-1896-cm')
    expect(row).toMatchObject({
      vin: 'TMBCG21U542894707',
      plate: null,
      make: 'SKODA',
      model: 'OCTAVIA',
      engineCc: 1896
    })
    expect(row.sellerKind).toBe('customs')
    expect(findPlate(['реєстраційний номер 1896 см.куб.'])).toBeNull()
  })

  it('reads plates through the shared normalizer, Latin look-alikes included', () => {
    expect(findPlate(['д.н.з. AE8934XC'])).toBe('АЕ8934ХС')
    expect(findPlate(['державний номерний знак 25134ОН'])).toBe('25134ОН')
    expect(findPlate(['Номер шасі VF1RFB00356373036'])).toBeNull()
  })

  it('takes the first vehicle with an identifier and reports how many vehicles the auction has', () => {
    const res = parseOk('multi-vehicle')
    expect(res.vehicles).toBeGreaterThan(1)
    expect(res.row.vin ?? res.row.plate).toBeTruthy()
  })
})

describe('Prozorro rejects', () => {
  it('a building is not a vehicle', () => {
    expect(toProzorroAuctionInsert(fixture('building'), NOW)).toEqual({ ok: false, reason: 'not-vehicle' })
  })

  it('an "Автобус" without VIN or plate has no identifier', () => {
    expect(toProzorroAuctionInsert(fixture('bus-no-identifier'), NOW)).toEqual({ ok: false, reason: 'no-identifier' })
  })

  it('a forklift with a frame number and partial props has no identifier', () => {
    expect(toProzorroAuctionInsert(fixture('commercial-forklift-partial'), NOW)).toEqual({
      ok: false,
      reason: 'no-identifier'
    })
  })

  it('invalid records (no key, bad date, not an object) are counted as invalid', () => {
    expect(toProzorroAuctionInsert({ status: 'complete' }, NOW)).toEqual({ ok: false, reason: 'invalid' })
    expect(toProzorroAuctionInsert({ auctionId: 'X', status: 'complete', dateModified: 'soon' }, NOW)).toEqual({
      ok: false,
      reason: 'invalid'
    })
    expect(toProzorroAuctionInsert(null, NOW)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('railway wagons seized by ARMA are vehicle-typed but have no identifier', () => {
    expect(toProzorroAuctionInsert(fixture('arma'), NOW)).toEqual({ ok: false, reason: 'no-identifier' })
  })

  it('an item with no props is vehicle-like by its text and still needs an identifier', () => {
    const base = { auctionId: 'T-1', status: 'active_tendering', dateModified: '2026-10-01T10:00:00Z' }
    expect(toProzorroAuctionInsert({ ...base, title: { uk_UA: 'Будівля' }, items: [{}] }, NOW)).toEqual({
      ok: false,
      reason: 'not-vehicle'
    })
    expect(
      toProzorroAuctionInsert({ ...base, title: { uk_UA: 'Автомобіль ВАЗ 2107, д.н.з. АА1234ВВ' }, items: [{}] }, NOW)
    ).toMatchObject({ ok: true, row: { plate: 'АА1234ВВ', make: 'ВАЗ', sellerKind: 'state' } })
  })
})

describe('Prozorro seller kind', () => {
  it('bank: seller EDRPOU from the map, or the npl tag', () => {
    expect(parseOk('bank-raiffeisen').row).toMatchObject({ sellerKind: 'bank', sellerEdrpou: '14305909' })
    expect(parseOk('bank-npl-ukreximbank').row).toMatchObject({ sellerKind: 'bank', categories: ['npl', 'cars'] })
    expect(Object.keys(BANK_EDRPOU)).toContain('14360570')
  })

  it('arma by method or tag, lease without a seller falls back to the directions', () => {
    const none = { sellerName: null, sellerEdrpou: null, categories: [], directions: [] }
    expect(sellerKind({ ...none, sellingMethod: 'armaProperty-english' })).toBe('arma')
    expect(sellerKind({ ...none, sellingMethod: 'basicSell-english', categories: ['arma', 'transportSale'] })).toBe(
      'arma'
    )
    expect(parseOk('lease').row).toMatchObject({ sellerKind: 'lease', sellerName: null, sellerEdrpou: null })
  })

  it('priority and fallbacks', () => {
    const none = { sellerName: null, sellerEdrpou: null, categories: [], directions: [] }
    expect(sellerKind({ ...none, sellingMethod: 'basicSell-english', sellerName: 'ЛЬВІВСЬКА МИТНИЦЯ' })).toBe('customs')
    expect(sellerKind({ ...none, sellingMethod: 'basicSell-english', categories: ['customs', 'cars'] })).toBe('customs')
    expect(sellerKind({ ...none, sellingMethod: 'alienation-english' })).toBe('state')
    expect(sellerKind({ ...none, sellingMethod: 'smallPrivatization-english' })).toBe('state')
    expect(sellerKind({ ...none, sellingMethod: 'bankRuptcy-dutch', directions: ['bankRuptcy'] })).toBe('bankruptcy')
    expect(sellerKind({ ...none, sellingMethod: null })).toBe('state')
    // "банк" in a name is not enough: a bankruptcy manager stays bankruptcy
    expect(
      sellerKind({ ...none, sellingMethod: 'bankRuptcy-english', sellerName: 'Арбітражний керуючий Банков' })
    ).toBe('bankruptcy')
  })
})
