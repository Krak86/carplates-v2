import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  buildAlarmMapCardSvg,
  buildLossesCardSvg,
  lossesPreviewText,
  projectOblasts,
  readGeoJson,
  regionOfOblast,
  warDayLine,
  warDuration
} from './alarm-card.js'
import { renderPng } from './og-card.js'

const WEB_PUBLIC = join(import.meta.dirname, '../../../web/public')
const FONTS = ['NotoSans-Regular.ttf', 'NotoSans-Bold.ttf'].map(f => join(WEB_PUBLIC, 'fonts', f))
const PNG_SIGNATURE = '89504e470d0a1a0a'

const geo = readGeoJson(join(WEB_PUBLIC, 'ukraine-alarm-oblasts.geojson'))
const paths = geo ? projectOblasts(geo) : []

describe('regionOfOblast', () => {
  it('maps geojson names to plate-region names', () => {
    expect(regionOfOblast('Київ')).toBe('Київ')
    expect(regionOfOblast('Автономна Республіка Крим')).toBe('АР Крим')
    expect(regionOfOblast('Одеська')).toBe('Одеська область')
  })
})

describe('projectOblasts', () => {
  it('draws every oblast inside the map box', () => {
    expect(paths.length).toBeGreaterThan(20)
    const numbers = paths.flatMap(p => (p.d.match(/-?\d+\.\d/g) ?? []).map(Number))
    expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...numbers)).toBeLessThanOrEqual(1200)
  })
})

describe('warDuration', () => {
  it('counts years, months and days from 24 Feb 2022', () => {
    expect(warDuration('2026-11-05')).toEqual({ years: 4, months: 8, days: 12 })
    expect(warDuration('2022-03-01')).toEqual({ years: 0, months: 0, days: 5 })
    expect(warDuration('2022-02-23')).toBeNull()
  })

  it('writes the short line in each language', () => {
    expect(warDayLine('en', 1350, '2026-11-05')).toBe('Day 1,350 · 4 y 8 mo 12 d')
    expect(warDayLine('ua', null, '2026-11-05')).toBe('4 р. 8 міс. 12 дн.')
  })
})

describe('alert-map card', () => {
  const alarms = {
    fetchedAt: '2026-11-07T10:00:00.000Z',
    regions: [
      { region: 'Одеська область', scope: 'full' as const, level: 'Red', types: ['AIR'], updatedAt: null, areas: [] }
    ]
  }

  it('paints alerted oblasts and counts them', () => {
    const svg = buildAlarmMapCardSvg({ paths, alarms: alarms as never, lang: 'en' })
    expect(svg).toContain('#ef4444')
    expect(svg).toContain('regions with an alert')
  })

  it('fails closed: no feed means a grey map and "no data", never a calm map', () => {
    const svg = buildAlarmMapCardSvg({ paths, alarms: null, lang: 'en' })
    expect(svg).not.toContain('#ef4444')
    expect(svg).toContain('No data right now')
  })

  it('renders a PNG', () => {
    const png = renderPng(buildAlarmMapCardSvg({ paths, alarms: alarms as never, lang: 'ua' }), FONTS)
    expect(png.subarray(0, 8).toString('hex')).toBe(PNG_SIGNATURE)
  })
})

describe('losses card', () => {
  const data = {
    date: '2026-11-05',
    day: 1350,
    stats: { personnel_units: 1_200_000, tanks: 11_500 },
    increase: { personnel_units: 900 }
  }

  it('shows a missing counter as "-", never 0', () => {
    const svg = buildLossesCardSvg({ data, lang: 'en' })
    expect(svg).toContain('1,200,000')
    expect(svg).toContain('>-<')
  })

  it('previews the day line and the headline counter', () => {
    const text = lossesPreviewText('en', data)
    expect(text.description).toContain('Day 1,350 · 4 y 8 mo 12 d')
    expect(text.description).toContain('1,200,000 personnel')
  })

  it('renders a PNG', () => {
    const png = renderPng(buildLossesCardSvg({ data, lang: 'ua' }), FONTS)
    expect(png.subarray(0, 8).toString('hex')).toBe(PNG_SIGNATURE)
  })
})
