import { describe, expect, it } from 'vitest'

import { LEGACY_REGIONS, REGIONS } from './regions.js'

/**
 * Cross-check of `REGIONS` / `LEGACY_REGIONS` against VehiclesDB's `plates/_decode/ua-regions.yml` (CC BY 4.0,
 * vehiclesdb.com), which extracts Додаток 4 (letter pairs) and Додаток 6 (numeric codes) of МВС order № 166
 * (rev. 16.12.2025) mechanically. A test fixture only — the data is not a dependency. Each row:
 * [ISO 3166-2, our region name, Додаток 4 pairs, Додаток 6 codes].
 */
const STATUTE: readonly (readonly [string, string, string, string])[] = [
  ['UA-43', 'АР Крим', 'АК МА ТК МК', '01'],
  ['UA-05', 'Вінницька область', 'АВ КВ ІМ РІ', '02'],
  ['UA-07', 'Волинська область', 'АС КС СМ ТС', '03'],
  ['UA-12', 'Дніпропетровська область', 'АЕ КЕ РР МІ', '04'],
  ['UA-14', 'Донецька область', 'АН КН ТН МН', '05'],
  ['UA-18', 'Житомирська область', 'АМ КМ ТМ МВ', '06'],
  ['UA-21', 'Закарпатська область', 'АО КО МТ МО', '07'],
  ['UA-23', 'Запорізька область', 'АР КР ТР МР', '08'],
  ['UA-26', 'Івано-Франківська область', 'АТ КТ ТО ХС', '09'],
  ['UA-32', 'Київська область', 'АІ КІ ТІ ЕЕ', '10'],
  ['UA-30', 'Київ', 'АА КА ТТ КК', '11 31'],
  ['UA-35', 'Кіровоградська область', 'ВА НА ХА ЕА', '12'],
  ['UA-09', 'Луганська область', 'ВВ НВ ЕР ЕВ', '13'],
  ['UA-46', 'Львівська область', 'ВС НС СС ЕС', '14'],
  ['UA-48', 'Миколаївська область', 'ВЕ НЕ ХЕ ХН', '15'],
  ['UA-51', 'Одеська область', 'ВН НН ОО ЕН', '16'],
  ['UA-53', 'Полтавська область', 'ВІ НІ ХІ ЕІ', '17'],
  ['UA-56', 'Рівненська область', 'ВК НК ХК ЕК', '18'],
  ['UA-59', 'Сумська область', 'ВМ НМ ХМ ЕМ', '19'],
  ['UA-61', 'Тернопільська область', 'ВО НО ХО ЕО', '20'],
  ['UA-63', 'Харківська область', 'АХ КХ ХХ ЕХ', '21'],
  ['UA-65', 'Херсонська область', 'ВТ НТ ХТ ЕТ', '22'],
  ['UA-68', 'Хмельницька область', 'ВХ НХ ОХ РХ', '23'],
  ['UA-71', 'Черкаська область', 'СА ІА ОА РА', '24'],
  ['UA-74', 'Чернігівська область', 'СВ ІВ ОВ РВ', '25'],
  ['UA-77', 'Чернівецька область', 'СЕ ІЕ ОЕ РЕ', '26'],
  ['UA-40', 'Севастополь', 'СН ІН ОН РН', '27']
]

const statutePairs = STATUTE.flatMap(([, region, pairs]) => pairs.split(' ').map(pair => ({ pair, region })))
const statuteNumeric = STATUTE.flatMap(([, region, , codes]) => codes.split(' ').map(code => ({ code, region })))

describe('REGIONS vs the statutory plate-code table', () => {
  it('has 27 regions and 108 distinct pairs in the statute', () => {
    expect(STATUTE).toHaveLength(27)
    expect(new Set(statutePairs.map(p => p.pair)).size).toBe(108)
  })

  it('maps every statutory pair to its region, and nothing else', () => {
    expect(Object.fromEntries(statutePairs.map(({ pair, region }) => [pair, region]))).toEqual(REGIONS)
  })
})

describe('LEGACY_REGIONS vs the statutory numeric codes', () => {
  it('maps every statutory numeric code to its region, and nothing else', () => {
    expect(Object.fromEntries(statuteNumeric.map(({ code, region }) => [code, region]))).toEqual(LEGACY_REGIONS)
  })
})
