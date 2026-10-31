import { describe, expect, it } from 'vitest'

import { dtpRegion, gpsPair, kmToMetres, parseHazardCsv, roadCode } from './dtp-parse.js'

const PLACES_CSV = [
  '﻿№;Region;Road Index;Road Name;Section Start (km+m);Section End (km+m);GPS Coordinates, Start (Latitude/Longitude);GPS Coordinates, End (Latitude/Longitude);Accident Rate Coefficient;Hazard Level;Number of Road Accidents in the Three Years Prior to Registration',
  '1;Вінницька;М-30 ;Стрий - Умань;351+200 ;351+600;49.339347 28.063269;49.336843 28.067053;0,5;Малонебезпечні;8',
  '2;Дніпропетровська ;P-17;Біла Церква;367+560;367+761;49.279056 28.256072;49.279571 28.258492;0,36;null;5',
  '3;Київська;Р-84 (Т-14-19);Дорога;10+0;10+50;48.4328426, 364633821;;;;3',
  '4;Невідома;М-01;Дорога;1+0;2+0;;;;;1',
  '5;Львівська;;Без коду;1+0;2+0;;;;;1'
].join('\n')

describe('dtpRegion', () => {
  it('maps file spellings to the canonical plate_regions name', () => {
    expect(dtpRegion('Вінницька')).toBe('Вінницька область')
    expect(dtpRegion('Дніпропетровська ')).toBe('Дніпропетровська область')
    expect(dtpRegion('Луганська*')).toBe('Луганська область')
    expect(dtpRegion('м. Київ')).toBe('Київ')
    expect(dtpRegion('Київська обл.')).toBe('Київська область')
    expect(dtpRegion('Невідома')).toBeNull()
    expect(dtpRegion('')).toBeNull()
  })
})

describe('roadCode', () => {
  it('trims, folds Latin look-alikes and keeps the first token', () => {
    expect(roadCode('М-30 ')).toBe('М-30')
    expect(roadCode('P-17')).toBe('Р-17')
    expect(roadCode('Р-84 (Т-14-19)')).toBe('Р-84')
    expect(roadCode('Т-02-12')).toBe('Т-02-12')
    expect(roadCode('')).toBeNull()
    expect(roadCode('null')).toBeNull()
  })
})

describe('kmToMetres', () => {
  it('converts km+m', () => {
    expect(kmToMetres('351+200 ')).toBe(351200)
    expect(kmToMetres('0+50')).toBe(50)
    expect(kmToMetres('351')).toBeNull()
    expect(kmToMetres(undefined)).toBeNull()
  })
})

describe('gpsPair', () => {
  it('accepts space or comma separated pairs inside Ukraine', () => {
    expect(gpsPair('49.339347 28.063269')).toEqual([49.339347, 28.063269])
    expect(gpsPair('49.40688022, 28.52797257')).toEqual([49.40688022, 28.52797257])
  })

  it('rejects glued, single and out-of-bounds values', () => {
    expect(gpsPair('48.4328426, 364633821')).toBeNull()
    expect(gpsPair('49.0053923')).toBeNull()
    expect(gpsPair('51.1862141, 51.182768')).toBeNull()
    expect(gpsPair('')).toBeNull()
  })
})

describe('parseHazardCsv', () => {
  const parsed = parseHazardCsv(PLACES_CSV, 2025, 'concentration')

  it('keeps valid rows and counts the dropped ones', () => {
    expect(parsed.rows).toBe(5)
    expect(parsed.sections).toHaveLength(3)
    expect(parsed.invalid).toBe(2)
    expect(parsed.noCoords).toBe(1)
  })

  it('maps a full row', () => {
    expect(parsed.sections[0]).toEqual({
      year: 2025,
      kind: 'concentration',
      seq: 1,
      region: 'Вінницька область',
      roadCode: 'М-30',
      roadName: 'Стрий - Умань',
      kmStart: 351200,
      kmEnd: 351600,
      latStart: 49.339347,
      lonStart: 28.063269,
      latEnd: 49.336843,
      lonEnd: 28.067053,
      crashes3y: 8,
      rate: 0.5,
      hazardLevel: 'Малонебезпечні'
    })
  })

  it('treats the literal null level as missing and keeps rows with bad coordinates', () => {
    expect(parsed.sections[1]).toMatchObject({ roadCode: 'Р-17', hazardLevel: null })
    expect(parsed.sections[2]).toMatchObject({ roadCode: 'Р-84', latStart: null, lonStart: null, latEnd: null })
  })

  it('throws on a file without the required columns', () => {
    expect(() => parseHazardCsv('a;b\n1;2', 2025, 'hazard')).toThrow(/missing column/)
  })
})
