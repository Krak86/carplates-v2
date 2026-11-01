import type { UnionRow } from './auctions-union.js'

/** A photo document id as stored in `prozorro_auctions.photo_urls`. */
export const PHOTO_DOC = 'a'.repeat(32)

/** A SETAM row of the union, the way the driver returns it. */
export function unionRow(over: Partial<UnionRow> = {}): UnionRow {
  return {
    source: 'setam',
    grp: 'setam',
    lot_no: 100,
    auction_id: null,
    proceeding_no: '123/45',
    status: 'Торги не відбулися',
    raw_status: null,
    category: 'Легкові автомобілі',
    region: 'Київ',
    start_price: 100000,
    sale_price: null,
    year: 2007,
    make: 'SUBARU',
    model: 'FORESTER',
    title: 'Транспортний засіб SUBARU FORESTER, 2007 року випуску, ДНЗ: АА 2335 ЕТ',
    plate: 'АА2335ЕТ',
    vin: null,
    when_at: new Date('2024-08-31T00:00:00Z'),
    source_file: 'auctions-31-08-2024.csv',
    first_seen_at: new Date('2026-09-01T00:00:00Z'),
    updated_at: new Date('2026-09-02T00:00:00Z'),
    selling_method: null,
    seller_name: null,
    seller_kind: null,
    auction_type: null,
    auction_start: null,
    minimal_step: null,
    guarantee: null,
    color: null,
    kilometrage: null,
    fuel: null,
    engine_cc: null,
    transmission: null,
    condition: null,
    damaged: null,
    damage_text: null,
    locality: null,
    photo_urls: [],
    ...over
  }
}

/** A Prozorro.Sale row of the union: the Renault 11GTA of the real feed (`BRE001-UA-20260924-95103`). */
export function prozorroRow(over: Partial<UnionRow> = {}): UnionRow {
  return unionRow({
    source: 'prozorro',
    grp: 'bankruptcy',
    lot_no: null,
    auction_id: 'BRE001-UA-20260924-95103',
    proceeding_no: null,
    status: 'Торги не відбулися',
    raw_status: 'unsuccessful',
    category: null,
    start_price: 230160,
    year: 2003,
    make: 'RENAULT',
    model: '11GTA',
    title: 'Аукціон з продажу майна банкрута ... RENAULT 11GTA',
    plate: 'АА3895КК',
    vin: 'VF611GTA000122884',
    source_file: null,
    when_at: '2026-10-13T09:15:00.000Z',
    selling_method: 'bankRuptcy-english',
    seller_name: 'Арбітражний керуючий БІЛИК ОЛЕКСАНДР АНАТОЛІЙОВИЧ',
    seller_kind: 'bankruptcy',
    auction_type: 'english',
    auction_start: '2026-10-13T09:15:00.000Z',
    minimal_step: 2301.6,
    guarantee: 23016,
    color: 'білий',
    kilometrage: 988816,
    fuel: 'diesel',
    engine_cc: 11929,
    damaged: false,
    photo_urls: [`https://procedure.prozorro.sale/api/documents/public/${PHOTO_DOC}`, 'https://example.com/x.pdf'],
    ...over
  })
}
