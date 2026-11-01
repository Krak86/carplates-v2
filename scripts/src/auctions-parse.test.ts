import { describe, expect, it } from 'vitest'

import {
  auctionLayout,
  lotPrice,
  lotRegion,
  parseAuctionCsv,
  parseLotTitle,
  titlePlate,
  titleVin,
  titleYear
} from './auctions-parse.js'

const NOW = new Date('2026-10-31T12:00:00Z')
const BOM = String.fromCharCode(0xfeff)

// Titles copied from the real SETAM files (2019-2026).
describe('lot title parsing', () => {
  it('reads the standard "ДНЗ + № кузова" title', () => {
    expect(
      parseLotTitle(
        'Транспортний засіб SUBARU FORESTER, 2007 року випуску, № кузова: JF1SG5LE58G145231, ДНЗ: АА 2335 ЕТ',
        NOW
      )
    ).toEqual({ plate: 'АА2335ЕТ', vin: 'JF1SG5LE58G145231', make: 'SUBARU', model: 'FORESTER', year: 2007 })
  })

  it('reads the "державний номер / номер шасі" variant', () => {
    expect(
      parseLotTitle(
        'Автомобіль марки LEXUS LX 570, типу легковий універсал-В, 2008 року випуску, державний номер ВА 1111 АС, номер шасі JTJHY00W284009302',
        NOW
      )
    ).toMatchObject({ plate: 'ВА1111АС', vin: 'JTJHY00W284009302', make: 'LEXUS', year: 2008 })
  })

  it('reads a plate without a label', () => {
    expect(
      parseLotTitle('Легковий універсал-В OPEL VIVARO 2008 року випуску, АХ3201ЕС, кузов № WOLF7AMA68V624885', NOW)
    ).toMatchObject({ plate: 'АХ3201ЕС', make: 'OPEL', model: 'VIVARO', year: 2008 })
  })

  it('takes the model from "модель X" and strips the engine size', () => {
    expect(
      parseLotTitle(
        'Автомобіль марки VOLKSWAGEN, модель GOLF, легковий, 2005 р.в., VIN/номер кузова WVWZZZ1KZ5W512738, д.н.з. АВ1780ІЕ',
        NOW
      )
    ).toMatchObject({ make: 'VOLKSWAGEN', model: 'GOLF', year: 2005, plate: 'АВ1780ІЕ', vin: 'WVWZZZ1KZ5W512738' })
    expect(
      parseLotTitle('Транспортний засіб марки Ford Taurus 3.0i V6, 1991 року випуску, ДНЗ: 89239ІВ', NOW).model
    ).toBe('TAURUS')
    expect(
      parseLotTitle(
        'Транспортний засіб марки «PEUGEOT», рік випуску-2007, модель «307», реєстраційний номер WGR90U3 (PL)',
        NOW
      )
    ).toMatchObject({ make: 'PEUGEOT', model: '307', year: 2007 })
  })

  it('keeps Cyrillic-native makes Cyrillic and does not swallow descriptors into the model', () => {
    expect(
      parseLotTitle('Автомобіль ГАЗ 2217 (пасажирський-В), колір синій, реєстраційний номер ВМ0256АО', NOW)
    ).toMatchObject({
      make: 'ГАЗ',
      model: '2217',
      plate: 'ВМ0256АО'
    })
    expect(
      parseLotTitle('Автомобіль УАЗ 3303 без документів, без реєстраційних номерів, рік виготовлення - невідомий', NOW)
    ).toMatchObject({
      make: 'УАЗ',
      model: '3303',
      plate: null,
      year: null
    })
    expect(parseLotTitle('Вантажний автомобіль КАМАЗ-5511, 1983 рік випуску, держ. номер 15318НА', NOW)).toMatchObject({
      make: 'КАМАЗ',
      model: '5511',
      plate: '15318НА',
      year: 1983
    })
  })

  it('matches makes typed with Cyrillic look-alikes or common typos', () => {
    expect(parseLotTitle('Автомобіль Merсedes-Benz VITO 115CDI, 2005 року випуску, ДНЗ АВ4622ВО', NOW)).toMatchObject({
      make: 'MERCEDES-BENZ',
      model: 'VITO 115CDI'
    })
    expect(parseLotTitle('Вантажний фургон МАN LЕ180С, 2001 року випуску, ДНЗ ВЕ4496ВМ', NOW).make).toBe('MAN')
    expect(parseLotTitle('Добровільний продаж. Транспортний засіб CHEWROLET NUBIRA, ДНЗ: 00200PO', NOW).make).toBe(
      'CHEVROLET'
    )
    expect(parseLotTitle('Автомобіль VAZ 21043, 2004 року випуску', NOW)).toMatchObject({ make: 'ВАЗ', model: '21043' })
  })

  it('finds a make that is followed straight by the plate label (no model)', () => {
    expect(
      parseLotTitle(
        'Добровільний продаж. Транспортний засіб ZHONG XING, ДНЗ: BC8484AK, 2005 року випуску, VIN: LTA6GH3B061001185',
        NOW
      )
    ).toMatchObject({ make: 'ZHONG XING', model: null, year: 2005 })
  })

  it('keeps foreign, Soviet-era and dashed plates', () => {
    expect(
      titlePlate('Автомобіль Renault Scenic, польський номерний знак EL9N097, номер кузову VF1JA050525988424')
    ).toBe('ЕL9N097')
    expect(titlePlate('Транспортний засіб марки IVECO, державний номерний знак № 9939 КІА тип ТЗ')).toBe('9939КІА')
    expect(titlePlate('Транспортний засіб ГАЗ 2410, легковий, ДНЗ 256-28ХК, кузов 1210303')).toBe('256-28ХК')
    expect(titlePlate('Легковий автомобіль ВАЗ 2106 1971 року випуску, 076-72ХВ, кузов № 1952711/5700')).toBe(
      '076-72ХВ'
    )
    expect(titlePlate('Автомобіль Volkswagen Golf, реєстраційний номер GEU 308, колір чорний')).toBe('GЕU308')
    expect(titlePlate('Шарнірний самоскид TEREX TA-35, 2008 р.в., двигун 06R0978821, д/н Т04463АЕ')).toBe('Т04463АЕ')
  })

  it('normalizes a Latin plate to the Cyrillic registry key', () => {
    expect(titlePlate('Транспортний засіб FORD, ДНЗ: AE9137PH')).toBe('АЕ9137РН')
  })

  it('does not invent a plate when the title says there is none', () => {
    expect(titlePlate('Бензовоз, ГАЗ 5201, без номерного знака, рік випуску не встановлено')).toBeNull()
    expect(
      titlePlate(
        'Колісний транспортний засіб ЗІЛ 131, ідентифікаційний номер (VIN) відсутній, реєстраційний номер відсутній'
      )
    ).toBeNull()
    expect(titlePlate('Транспортні засоби в кількості 4 одиниці')).toBeNull()
  })

  it('never mistakes a VIN for a plate', () => {
    expect(titlePlate('Автомобіль, № кузова: WVWZZZ1KZ5W512738')).toBeNull()
  })
})

describe('VIN extraction', () => {
  it('folds Cyrillic look-alikes inside the VIN', () => {
    expect(titleVin('кузов № WF0UXXTTPUАB27894, ДНЗ: АА5122ТА')).toBe('WF0UXXTTPUAB27894') // Cyrillic А
    expect(titleVin('№ кузову: XТС65201071137521')).toBe('XTC65201071137521') // Cyrillic Т, С
  })

  it('repairs the letters O / I / Q that no VIN has', () => {
    expect(titleVin('номер кузова WOLOTGF752H015095')).toBe('W0L0TGF752H015095')
    expect(titleVin('номер кузова YVIVW7313YF559217')).toBe('YV1VW7313YF559217')
  })

  it('ignores short chassis numbers and 17-character words', () => {
    expect(titleVin('VIN: 541013500785, ДНЗ: ВВ6090АІ')).toBeNull()
    expect(titleVin('Транспортний засіб у кількості одиниць')).toBeNull()
  })
})

describe('year, price, region', () => {
  it('reads the year spellings seen in the feed', () => {
    expect(titleYear('2007 року випуску', NOW)).toBe(2007)
    expect(titleYear('1992 р.в.', NOW)).toBe(1992)
    expect(titleYear('Автомобіль, рік випуску 2012, колір', NOW)).toBe(2012)
    expect(titleYear('рік виробництва ТЗ: 2006', NOW)).toBe(2006)
    expect(titleYear('Автомобіль ВАЗ 2107, колір білий', NOW)).toBeNull()
    expect(titleYear('2031 року випуску', NOW)).toBeNull()
  })

  it('treats 0.00 and blanks as "no price"', () => {
    expect(lotPrice('192305.00')).toBe(192305)
    expect(lotPrice('0.00')).toBeNull()
    expect(lotPrice('')).toBeNull()
    expect(lotPrice(undefined)).toBeNull()
  })

  it('maps SETAM locations to region names', () => {
    expect(lotRegion('м.Київ')).toBe('Київ')
    expect(lotRegion('Вінницька обл.')).toBe('Вінницька область')
    expect(lotRegion('Івано-Франківська обл.')).toBe('Івано-Франківська область')
    expect(lotRegion('Київська обл.')).toBe('Київська область')
    expect(lotRegion('')).toBeNull()
  })
})

const HEADER_NEW =
  'Назва,Стан,Категорія,Місцезнаходження,Переможець,"Номер лота","Стартова ціна","Ціна продажу",Провадження'
const HEADER_OLD = 'Назва,Стан,Категорія,Місцезнаходження,Переможець,"Номер лота","Стартова ціна","Ціна продажу"'
const HEADER_TYPO =
  'Назва,Стан,Категорія,Місцезнаходження,Переможець,"Номер лота","Стартова ціна","Ціна продажу",Проовадження'

describe('CSV parsing', () => {
  it('keeps only car / truck lots and never stores the winner', () => {
    const csv = [
      HEADER_NEW,
      '"Трьохкімнатна квартира №19, м. Вінниця","Торги відбулися","Житлова нерухомість","Вінницька обл.","Учасник №3",99321,696195.00,696195.00,38600504',
      '"Транспортний засіб SUBARU FORESTER, 2007 року випуску, № кузова: JF1SG5LE58G145231, ДНЗ: АА 2335 ЕТ","Торги відбулися","Легкові автомобілі",м.Київ,"Учасник №7",204016,192305.00,201500.00,64848860',
      '"Моторний човен","Торги не відбулися","Водний транспорт","Одеська обл.",,205000,1000.00,0.00,1'
    ].join('\n')
    const { lots, rows, invalid } = parseAuctionCsv(csv, 'auctions-30-10-2026.csv', NOW)
    expect(rows).toBe(3)
    expect(invalid).toBe(0)
    expect(lots).toHaveLength(1)
    expect(lots[0]).toEqual({
      lotNo: 204016,
      proceedingNo: '64848860',
      status: 'Торги відбулися',
      category: 'Легкові автомобілі',
      region: 'Київ',
      startPrice: 192305,
      salePrice: 201500,
      titleRaw: 'Транспортний засіб SUBARU FORESTER, 2007 року випуску, № кузова: JF1SG5LE58G145231, ДНЗ: АА 2335 ЕТ',
      plate: 'АА2335ЕТ',
      vin: 'JF1SG5LE58G145231',
      make: 'SUBARU',
      model: 'FORESTER',
      year: 2007,
      sourceFile: 'auctions-30-10-2026.csv'
    })
    expect(JSON.stringify(lots)).not.toContain('Учасник')
  })

  it('reads old files without the proceeding column and the "Проовадження" typo', () => {
    const row =
      '"Автомобіль ГАЗ 53, ДНЗ 09862НР","Торги не відбулися","Вантажні автомобілі","Львівська обл.",,1001,500.00,0.00'
    expect(parseAuctionCsv(`${HEADER_OLD}\n${row}`, 'old.csv', NOW).lots[0]).toMatchObject({
      lotNo: 1001,
      proceedingNo: null,
      salePrice: null
    })
    expect(parseAuctionCsv(`${HEADER_TYPO}\n${row},777`, 'typo.csv', NOW).lots[0]).toMatchObject({
      proceedingNo: '777'
    })
  })

  it('strips a BOM and counts records it cannot use', () => {
    const csv = `${BOM}${HEADER_OLD}\n"Автомобіль","Торги відбулися","Легкові автомобілі","м.Київ",,abc,1.00,0.00\n"","Торги","Легкові автомобілі","м.Київ",,5,1.00,0.00`
    const out = parseAuctionCsv(csv, 'bom.csv', NOW)
    expect(out.lots).toHaveLength(0)
    expect(out.invalid).toBe(2)
  })

  it('fails loudly when a required column is renamed', () => {
    expect(() => auctionLayout(['Назва', 'Стан', 'Категорія', 'Лот'])).toThrow(/lotNo/)
    expect(() => parseAuctionCsv('', 'empty.csv', NOW)).toThrow(/empty/)
  })
})
