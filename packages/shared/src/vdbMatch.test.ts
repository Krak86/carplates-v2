import { describe, expect, it } from 'vitest'

import { makeKey, modelKey } from './vehicleKey.js'
import {
  collapseDoubledModel,
  displayAliases,
  isUkraineOnly,
  matchVdbModel,
  matchVdbModelAcrossMakes,
  otherMarkets,
  vdbCandidateKeys,
  vdbCatalogKinds,
  vdbRelatedMakeKeys,
  vdbVehicleClass,
  type VdbReferenceRow
} from './vdbMatch.js'

type Row = VdbReferenceRow & { name: string }

const row = (make: string, name: string, extra: Partial<VdbReferenceRow> = {}): Row => ({
  name,
  kind: 'car',
  makeKey: makeKey(make)!,
  modelKey: modelKey(name)!,
  bodyTypes: [],
  countries: ['nl'],
  regions: ['eu'],
  globalDecile: 5,
  aliases: [],
  ...extra
})

/** Rows copied from VehiclesDB 2026.10.0 (make → model names); the registry strings in the tests are real ones. */
const CATALOG: Row[] = [
  row('BMW', '3 Series'),
  row('BMW', '5 Series'),
  row('Mazda', '3'),
  row('Mazda', '626'),
  row('Mercedes-Benz', 'S-Class'),
  row('Mercedes-Benz', 'V-Class'),
  row('Mercedes-Benz', 'GLE'),
  row('Mercedes-Benz', 'GL'),
  row('Mercedes-Benz', 'Sprinter'),
  row('Mercedes-Benz', 'Vito'),
  row('Lexus', 'RX'),
  row('Lexus', 'ES'),
  row('Lexus', 'LX'),
  row('Toyota', 'Land Cruiser Prado'),
  row('Toyota', 'Land Cruiser'),
  row('Toyota', 'Camry'),
  row('Toyota', 'Camry Hybrid LE'),
  row('Suzuki', 'SX4'),
  row('Suzuki', 'SX4 S-Cross'),
  row('Skoda', 'Octavia'),
  row('Ford', 'Transit'),
  row('Ford', 'Focus'),
  row('Honda', 'Accord'),
  row('Honda', 'Accord 2'),
  row('Lada', '2108'),
  row('Lada', '2121', { countries: ['ua', 'nl'] }),
  row('Lada', '2107', { aliases: ['Semyorka'], countries: ['ua'] }),
  row('Lada', '110'),
  row('Lada', '111'),
  row('Lada', '112'),
  row('Lada', 'Samara'),
  row('Lada', '2172'),
  row('UAZ', '469'),
  row('Chevrolet', 'Aveo'),
  row('GAZ', 'Volga'),
  row('GAZ', '24'),
  row('Renault', 'Megane'),
  row('Renault', 'Clio'),
  row('Dacia', 'Dokker', { kind: 'van' }),
  row('Dacia', 'Duster'),
  row('Dacia', 'Logan'),
  row('Volkswagen', 'Transporter', { kind: 'van' }),
  row('Volkswagen', 'Transporter', { kind: 'car', globalDecile: 3 }),
  row('Opel', 'Astra'),
  row('Renault', 'Scenic'),
  row('Fiat', 'Doblo'),
  row('Audi', 'A4'),
  row('Audi', 'A6'),
  row('Volkswagen', 'CC')
]

function match(brand: string, model: string): { name: string; how: string } | null {
  const mk = makeKey(brand)!
  const m = matchVdbModel(
    CATALOG.filter(r => r.makeKey === mk),
    mk,
    model
  )
  return m ? { name: m.row.name, how: m.how } : null
}

describe('collapseDoubledModel', () => {
  it('keeps one copy of a doubled model name', () => {
    expect(collapseDoubledModel('TRANSIT TRANSIT')).toBe('TRANSIT')
    expect(collapseDoubledModel('LAND CRUISER LAND CRUISER')).toBe('LAND CRUISER')
  })

  it('leaves everything else alone', () => {
    expect(collapseDoubledModel('GOLF GOLF PLUS')).toBe('GOLF GOLF PLUS')
    expect(collapseDoubledModel('  CR-V  LX ')).toBe('CR-V LX')
  })
})

describe('matchVdbModel — exact and alias', () => {
  it('matches the same key regardless of punctuation and doubled names', () => {
    expect(match('FORD', 'TRANSIT TRANSIT')).toEqual({ name: 'Transit', how: 'exact' })
    expect(match('SUZUKI', 'sx-4')).toEqual({ name: 'SX4', how: 'exact' })
  })

  it('strips a marketing "NEW" prefix (SUZUKI | NEW SX4)', () => {
    expect(match('SUZUKI', 'NEW SX4')).toEqual({ name: 'SX4', how: 'exact' })
  })

  it('matches a catalog alias (Lada 2107 "Semyorka")', () => {
    expect(match('ВАЗ', 'semyorka')).toEqual({ name: '2107', how: 'alias' })
  })

  it('prefers a car row over a van row of the same name, then the more popular decile', () => {
    const mk = makeKey('Volkswagen')!
    const m = matchVdbModel(
      CATALOG.filter(r => r.makeKey === mk),
      mk,
      'TRANSPORTER'
    )
    expect(m?.row.kind).toBe('car')
  })
})

describe('matchVdbModel — series, nameplate and curated aliases', () => {
  it('maps BMW trim codes to the series (320D, 520I, 116 I)', () => {
    expect(match('BMW', '320D')).toEqual({ name: '3 Series', how: 'series' })
    expect(match('BMW', '520I')).toEqual({ name: '5 Series', how: 'series' })
  })

  it('maps the Mazda digit to its model', () => {
    expect(match('MAZDA', '3')).toEqual({ name: '3', how: 'exact' })
  })

  it('maps Mercedes S/V letter + figure codes to the class', () => {
    expect(match('MERCEDES-BENZ', 'S 500')).toEqual({ name: 'S-Class', how: 'alias' })
    expect(match('MERCEDES-BENZ', 'V 300 D')).toEqual({ name: 'V-Class', how: 'alias' })
  })

  it('does not fire the short GL rule on GLE', () => {
    expect(match('MERCEDES-BENZ', 'GLE 350D')).toEqual({ name: 'GLE', how: 'prefix' })
  })

  it('reduces Lexus "RX 350" to the nameplate', () => {
    expect(match('LEXUS', 'RX 350')).toEqual({ name: 'RX', how: 'prefix' })
    expect(match('LEXUS', 'LX 570')).toEqual({ name: 'LX', how: 'prefix' })
  })

  it('maps the bare PRADO to Land Cruiser Prado, and GAZ-3110 to Volga', () => {
    expect(match('TOYOTA', 'PRADO')).toEqual({ name: 'Land Cruiser Prado', how: 'alias' })
    expect(match('ГАЗ', '3110')).toEqual({ name: 'Volga', how: 'alias' })
  })
})

describe('matchVdbModel — prefix', () => {
  it('finds the shorter catalog model when the registry adds a variant (OCTAVIA A5, SPRINTER 316 CDI)', () => {
    expect(match('SKODA', 'OCTAVIA A5')).toEqual({ name: 'Octavia', how: 'prefix' })
    expect(match('MERCEDES-BENZ', 'SPRINTER 316 CDI')).toEqual({ name: 'Sprinter', how: 'prefix' })
    expect(match('OPEL', 'ASTRA SPORTS TOURER')).toEqual({ name: 'Astra', how: 'prefix' })
  })

  it('takes the closest catalog key when the registry key extends several (Camry)', () => {
    expect(match('TOYOTA', 'CAMRY SE')).toEqual({ name: 'Camry', how: 'prefix' })
  })

  it('matches a Lada five/six-digit factory code to its four-digit model (21083, 212140)', () => {
    expect(match('ВАЗ', '21083')).toEqual({ name: '2108', how: 'prefix' })
    expect(match('ВАЗ', '212140')).toEqual({ name: '2121', how: 'prefix' })
  })

  it('does not let a digit-ending catalog key swallow a longer number (ACCORD 2.0 is not "Accord 2")', () => {
    expect(match('HONDA', 'ACCORD 2.0')).toEqual({ name: 'Accord', how: 'prefix' })
  })

  it('never prefix-matches on a key shorter than three characters', () => {
    const mk = makeKey('Mazda')!
    const rows = [row('Mazda', 'MX')]
    expect(matchVdbModel(rows, mk, 'MX-5')).toBeNull()
  })
})

describe('matchVdbModel — misses stay misses', () => {
  it('returns null for models the catalog lacks (hide the data, never guess)', () => {
    expect(match('ВАЗ', '2123')).toBeNull()
    expect(match('ЗАЗ', '110307')).toBeNull()
    expect(match('ГАЗ', '3302')).toBeNull()
    expect(match('RENAULT', 'DOKKER')).toBeNull()
    expect(match('TOYOTA', 'VENZA')).toBeNull()
    expect(match('FORD', '')).toBeNull()
  })

  it('gives vdbCandidateKeys nothing for an empty model', () => {
    expect(vdbCandidateKeys('ford', '  ')).toEqual([])
  })
})

describe('cross-make aliases', () => {
  const across = (brand: string, model: string): string | null => {
    const found = matchVdbModelAcrossMakes(CATALOG, makeKey(brand)!, model)
    return found ? `${found.row.makeKey}/${found.row.name}` : null
  }

  it('finds the Renault Dokker under Dacia, spelled as the registry does', () => {
    expect(across('RENAULT', 'DOKKER')).toBe('dacia/Dokker')
    expect(across('RENAULT', 'DOKKER DOKKER')).toBe('dacia/Dokker')
    expect(across('RENAULT', 'NEW DOKKER')).toBe('dacia/Dokker')
  })

  it('finds the Renault Taliant as the Dacia Logan', () => {
    expect(across('RENAULT', 'TALIANT')).toBe('dacia/Logan')
  })

  it('maps VAZ type-approval codes to the 2110 / 2111 / 2112 / Samara / Priora catalog rows', () => {
    expect(across('ВАЗ', '21104')).toBe('lada/110')
    expect(across('ВАЗ', '211010')).toBe('lada/110')
    expect(across('ВАЗ', '21114')).toBe('lada/111')
    expect(across('ВАЗ', '21124')).toBe('lada/112')
    expect(across('ВАЗ', '211540')).toBe('lada/Samara')
    expect(across('ВАЗ', '21144')).toBe('lada/Samara')
    expect(across('ВАЗ', '217030')).toBe('lada/2172')
    expect(across('ВАЗ', '21099')).toBeNull()
  })

  it('finds the Bogdan-badged VAZ, the ZAZ Vida, the UAZ-31512 and the GAZ-2410', () => {
    expect(across('БОГДАН', '211010')).toBe('lada/110')
    expect(across('ЗАЗ', 'VIDA')).toBe('chevrolet/Aveo')
    expect(across('УАЗ', '31512')).toBe('uaz/469')
    expect(across('ГАЗ', '2410')).toBe('gaz/24')
  })

  it('reaches the generation catalogue rows (stored under the registry make key lada)', () => {
    const gens = [
      ['lada', '2101'],
      ['lada', '2110'],
      ['lada', '2114'],
      ['lada', '2115'],
      ['lada', 'priora'],
      ['lada', 'kalina'],
      ['zaz', 'slavuta'],
      ['zaz', 'tavria'],
      ['gaz', 'gazelle'],
      ['uaz', '452']
    ].map(([mk, name]) => row(mk!, name!))
    const gen = (brand: string, model: string): string | null => {
      const found = matchVdbModelAcrossMakes(gens, makeKey(brand)!, model)
      return found ? `${found.row.makeKey}/${found.row.name}` : null
    }
    expect(makeKey('VAZ')).toBe('lada')
    expect(gen('ВАЗ', '21104')).toBe('lada/2110')
    expect(gen('ВАЗ', '211340')).toBe('lada/2114')
    expect(gen('ВАЗ', '21150')).toBe('lada/2115')
    expect(gen('ВАЗ', '2102')).toBe('lada/2101')
    expect(gen('ВАЗ', '217030')).toBe('lada/priora')
    expect(gen('ВАЗ', '11183')).toBe('lada/kalina')
    expect(gen('ЗАЗ', '110307')).toBe('zaz/slavuta')
    expect(gen('ЗАЗ', '110206')).toBe('zaz/tavria')
    expect(gen('ГАЗ', '33021')).toBe('gaz/gazelle')
    expect(gen('УАЗ', '3303')).toBe('uaz/452')
  })

  it('reaches the base model through marketing prefixes, engine figures and variant words', () => {
    expect(across('FIAT', 'NUOVO DOBLO')).toBe('fiat/Doblo')
    expect(across('AUDI', 'A4 1.8')).toBe('audi/A4')
    expect(across('AUDI', 'A4 AVANT')).toBe('audi/A4')
    expect(across('AUDI', 'A6 ALLROAD')).toBe('audi/A6')
    expect(across('RENAULT', 'GRAND SCENIC')).toBe('renault/Scenic')
    expect(across('VOLKSWAGEN', 'CC SPORT')).toBe('volkswagen/CC')
    expect(vdbCandidateKeys('mazda', '6 2.5').map(c => c.key)).toContain('mazda6')
  })

  it('lists the own make first and only curated extras', () => {
    expect(vdbRelatedMakeKeys('renault', 'DOKKER')).toEqual(['renault', 'dacia'])
    expect(vdbRelatedMakeKeys('renault', 'MEGANE')).toEqual(['renault'])
    expect(vdbRelatedMakeKeys('opel', 'DOKKER')).toEqual(['opel'])
  })

  it('does not borrow another make for other models, and prefers the own make', () => {
    expect(across('RENAULT', 'LODGY')).toBeNull()
    expect(across('RENAULT', 'MEGANE')).toBe('renault/Megane')
    expect(across('OPEL', 'ASTRA')).toBe('opel/Astra')
  })
})

describe('displayAliases', () => {
  it('keeps Latin names that differ from the model, drops spelling variants and non-Latin names', () => {
    expect(displayAliases(['Rabbit', 'ゴルフ'], 'Golf')).toEqual(['Rabbit'])
    expect(displayAliases(['ID3', 'ID 3'], 'ID.3')).toEqual([])
    expect(displayAliases(['Renault Duster'], 'Duster')).toEqual(['Renault Duster'])
    expect(displayAliases([], 'Golf')).toEqual([])
  })
})

describe('markets helpers', () => {
  it('flags UA-only nameplates and lists the other markets', () => {
    expect(isUkraineOnly({ countries: ['ua'] })).toBe(true)
    expect(isUkraineOnly({ countries: ['ua', 'nl'] })).toBe(false)
    expect(isUkraineOnly({ countries: [] })).toBe(false)
    expect(otherMarkets({ countries: ['ua', 'nl', 'de'] })).toEqual(['nl', 'de'])
  })
})

describe('vehicle classes and kind-restricted matching', () => {
  it('maps registry kinds to classes and leaves trailers/specials unmapped', () => {
    expect(vdbVehicleClass('ЛЕГКОВИЙ')).toBe('car')
    expect(vdbVehicleClass(' мопед ')).toBe('motorcycle')
    expect(vdbVehicleClass('КВАДРОЦИКЛ')).toBe('motorcycle')
    expect(vdbVehicleClass('ВАНТАЖНИЙ')).toBe('truck')
    expect(vdbVehicleClass('АВТОБУС')).toBe('bus')
    expect(vdbVehicleClass('ПРИЧІП')).toBeNull()
    expect(vdbVehicleClass(null)).toBeNull()
  })

  const MIXED: Row[] = [
    row('Honda', 'Civic'),
    row('Honda', 'CBR', { kind: 'motorcycle' }),
    row('Honda', 'Dio', { kind: 'moped' }),
    row('MAN', 'TGX', { kind: 'truck' }),
    row('Ford', 'Transit', { kind: 'van' }),
    row('Mercedes-Benz', 'Sprinter', { kind: 'van' }),
    row('Mercedes-Benz', 'Citaro', { kind: 'bus' })
  ]
  const pick = (cls: Parameters<typeof vdbCatalogKinds>[0], make: string, model: string): string | undefined =>
    matchVdbModelAcrossMakes(MIXED, makeKey(make)!, model, vdbCatalogKinds(cls))?.row.name

  it('only matches catalog kinds of the card’s class', () => {
    expect(pick('motorcycle', 'HONDA', 'CBR 600')).toBe('CBR')
    expect(pick('motorcycle', 'HONDA', 'DIO')).toBe('Dio')
    expect(pick('motorcycle', 'HONDA', 'CIVIC')).toBeUndefined()
    expect(pick('car', 'HONDA', 'CIVIC')).toBe('Civic')
    expect(pick('truck', 'MAN', 'TGX 18.440')).toBe('TGX')
    expect(pick('bus', 'MERCEDES-BENZ', 'CITARO')).toBe('Citaro')
  })

  it('lets vans stand in for trucks and buses (the registry files vans and minibuses there)', () => {
    expect(pick('truck', 'FORD', 'TRANSIT')).toBe('Transit')
    expect(pick('bus', 'MERCEDES-BENZ', 'SPRINTER 316 CDI')).toBe('Sprinter')
    expect(pick('bus', 'FORD', 'TRANSIT')).toBe('Transit')
  })
})
