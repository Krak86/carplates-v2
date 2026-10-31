import { describe, expect, it } from 'vitest'

import { parsePatrolWorkbook } from './dtp-xlsx-parse.js'
import type { PatrolSheet } from './dtp-xlsx-parse.js'

const REGIONS = [
  'Вінницька',
  'Волинська',
  'Дніпропетровська',
  'Житомирська',
  'Закарпатська',
  'Запорізька',
  'Івано-Франківська',
  'Київська',
  'Кіровоградська',
  'Львівська',
  'Миколаївська',
  'Одеська',
  'Полтавська',
  'Рівненська',
  'Сумська',
  'Тернопільська',
  'Харківська',
  'Херсонська',
  'Хмельницька',
  'Черкаська',
  'Чернівецька',
  'Чернігівська',
  'Київ',
  'Луганська*'
]

const PERIOD = 'за період з 01.01.2026 по 30.09.2026'
const INJ = 'ДТП з загиблими та/або травмованими'

/** A regional two-year sheet: `усього | загинуло | травмовано` under `2025 | 2026 | %`. */
const regional = (title: string, base: number): PatrolSheet => ({
  sheet: '2',
  data: [
    [title],
    [PERIOD],
    ['Регіон', INJ],
    ['', 'усього', '', '', 'загинуло', '', '', 'травмовано', '', ''],
    ['', '2025', '2026', '%', '2025', '2026', '%', '2025', '2026', '%'],
    ['АР Крим', '', '', '', '', '', '', '', '', ''],
    ...REGIONS.map((r, i) => [r, 90, base + i, 0, 20, 10 + i, 0, 100, 200 + i, 0])
  ]
})

const WEEKDAY: PatrolSheet = {
  sheet: '6',
  data: [
    ['Дорожньо-транспортнi пригоди  за днем тижня'],
    [PERIOD],
    [],
    ['День тижня', `Усього ${INJ}`],
    [],
    ['', '2025', '2026', '%'],
    ['Понеділок', 10, 11, 0],
    ['Неділя', 20, 22, 0]
  ]
}

const HOUR: PatrolSheet = {
  sheet: '7',
  data: [
    ['Дорожньо-транспортнi пригоди  за часом скоєння'],
    [PERIOD],
    [],
    ['Час', `Усього ${INJ}`],
    [],
    ['', '2025', '2026', '%'],
    [0, 4, 5, 0],
    [23, 6, 7, 0],
    ['Усього', 10, 12, 0]
  ]
}

const CAUSES: PatrolSheet = {
  sheet: '5',
  data: [
    ['Дорожньо-транспортнi пригоди  за причинами'],
    [PERIOD],
    [],
    ['Причини', INJ],
    ['', 'Усього ДТП', 'Загинуло осіб', 'Травмовано осіб'],
    ['ПОРУШЕННЯ ШВИДКОСТІ РУХУ', 100, 10, 120],
    ['Усього', 100, 10, 120]
  ]
}

const ROADS: PatrolSheet = {
  sheet: '9',
  data: [
    [`${INJ} на автодорогах державного значення`],
    [PERIOD],
    [],
    ['Дорога', '', INJ],
    ['', '', 'усього', '', '', 'загинуло', '', '', 'травмовано', ''],
    ['', '', '2025', '2026', '%', '2025', '2026', '%', '2025', '2026'],
    ['М-01', 'КИЇВ - ЧЕРНІГІВ', 60, 61, 0, 13, 12, 0, 78, 68]
  ]
}

const workbook = (region: PatrolSheet): PatrolSheet[] => [
  { sheet: 'Зміст', data: [['Перелік']] },
  region,
  WEEKDAY,
  HOUR,
  CAUSES,
  ROADS
]

describe('parsePatrolWorkbook', () => {
  const parsed = parsePatrolWorkbook(workbook(regional('Дорожньо-транспортнi пригоди', 500)))

  it('reads the year and the last reported month from the title', () => {
    expect(parsed.year).toBe(2026)
    expect(parsed.period).toBe(9)
  })

  it('takes the current-year column of each measure and canonical region names', () => {
    expect(parsed.regions).toHaveLength(REGIONS.length)
    expect(parsed.regions[0]).toMatchObject({
      region: 'Вінницька область',
      year: 2026,
      period: 9,
      crashes: 500,
      deaths: 10,
      injured: 200
    })
    expect(parsed.regions.map(r => r.region)).toContain('Київ')
    expect(parsed.regions.map(r => r.region)).toContain('Луганська область')
  })

  it('reads weekday and hour buckets and skips total rows', () => {
    expect(parsed.time).toEqual([
      { year: 2026, period: 9, dim: 'weekday', bucket: 1, crashes: 11 },
      { year: 2026, period: 9, dim: 'weekday', bucket: 7, crashes: 22 },
      { year: 2026, period: 9, dim: 'hour', bucket: 0, crashes: 5 },
      { year: 2026, period: 9, dim: 'hour', bucket: 23, crashes: 7 }
    ])
  })

  it('reads causes and roads', () => {
    expect(parsed.causes).toEqual([
      { year: 2026, period: 9, cause: 'ПОРУШЕННЯ ШВИДКОСТІ РУХУ', crashes: 100, deaths: 10, injured: 120 }
    ])
    expect(parsed.roads).toEqual([
      { roadCode: 'М-01', year: 2026, period: 9, roadName: 'КИЇВ - ЧЕРНІГІВ', crashes: 61, deaths: 12, injured: 68 }
    ])
  })

  it('rejects the pre-2022 layout that counts all crashes', () => {
    const old = regional('Дорожньо-транспортнi пригоди', 500)
    old.data[2] = ['Регіон', 'Усього ДТП']
    expect(() => parsePatrolWorkbook(workbook(old))).toThrow(/pre-2022/)
  })

  it('throws when the regional table is missing', () => {
    expect(() => parsePatrolWorkbook([WEEKDAY])).toThrow(/regional table not found/)
  })
})
