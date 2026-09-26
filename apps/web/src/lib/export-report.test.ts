import { describe, expect, it } from 'vitest'
import type { EuroNcapRatingsResponse, Registration, StatsResponse } from '@carplates/shared'

import { buildExportReport, buildLocalRecordsReport } from '@/lib/export-report'
import type { ExportInput, ExportTableSection, Translate } from '@/lib/export-report'

// A stand-in `t` that mirrors the string back with any interpolation values inlined, so
// assertions can check for actual content without loading the real i18n resources.
const t: Translate = (key, options) => {
  if (!options) return key
  return `${key}:${Object.values(options).join(',')}`
}

function registration(overrides: Partial<Registration> = {}): Registration {
  return {
    plate: 'АА1234АА',
    person: 'P',
    regAddrKoatuu: null,
    operCode: null,
    operName: 'Перша реєстрація',
    dReg: '2020-01-01',
    depCode: null,
    dep: 'ТСЦ 1234',
    brand: 'TOYOTA',
    model: 'CAMRY',
    vin: 'JT123456789012345',
    makeYear: 2020,
    color: 'ЧОРНИЙ',
    kind: 'ЛЕГКОВИЙ',
    body: 'СЕДАН',
    purpose: 'ЗАГАЛЬНИЙ',
    fuel: 'БЕНЗИН',
    capacity: 2500,
    powerKwt: null,
    ownWeight: 1500,
    totalWeight: 2000,
    plateInferred: false,
    ...overrides
  }
}

function baseInput(overrides: Partial<ExportInput> = {}): ExportInput {
  return {
    vehicle: { brand: 'TOYOTA', model: 'CAMRY', year: 2020, body: 'СЕДАН' },
    plate: 'АА1234АА',
    region: 'Київська область',
    current: registration(),
    vin: 'JT123456789012345',
    vinDecodeResults: null,
    plateHistoryActions: null,
    vinHistoryActions: null,
    wiki: null,
    photos: [],
    euroncap: null,
    nhtsa: null,
    jncap: null,
    cncap: null,
    kncap: null,
    iihs: null,
    stats: null,
    ...overrides
  }
}

describe('buildExportReport', () => {
  it('titles the report from brand/model/year and subtitles it with plate + vin', () => {
    const report = buildExportReport(baseInput(), t)
    expect(report.title).toBe('TOYOTA CAMRY (2020)')
    expect(report.subtitle).toBe('АА1234АА · JT123456789012345')
  })

  it('builds a Vehicle section with the current registration fields, skipping blanks', () => {
    const report = buildExportReport(baseInput(), t)
    const vehicle = report.sections.find(s => s.id === 'vehicle')
    expect(vehicle?.type).toBe('kv')
    if (vehicle?.type !== 'kv') throw new Error('expected kv section')
    const labels = vehicle.rows.map(r => r.label)
    expect(labels).toContain('field.capacity')
    expect(labels).not.toContain('field.power') // powerKwt is null alongside a present capacity
    expect(vehicle.rows.find(r => r.label === 'field.vin')?.value).toBe('JT123456789012345')
  })

  it('omits the Vehicle section entirely when there is no current registration and no vehicle info', () => {
    const report = buildExportReport(
      baseInput({ current: null, plate: null, region: null, vin: null, vehicle: { brand: null, model: null, year: null, body: null } }),
      t
    )
    expect(report.sections.find(s => s.id === 'vehicle')).toBeUndefined()
  })

  it('adds a Rankings section mirroring the ResultCard badges when stats data is available', () => {
    const stats: StatsResponse = {
      summary: { totalRows: 0, distinctPlates: 0, distinctVins: 0, plateless: 0 },
      byYear: [],
      byRegion: [{ totalRows: 1, distinctPlates: 1, distinctVins: 1, region: 'Київська область' }],
      byRegionYear: [],
      byBody: [],
      byKind: [],
      byColor: [{ totalRows: 1, distinctPlates: 1, distinctVins: 1, value: 'ЧОРНИЙ' }],
      byFuel: [],
      byBrand: [{ totalRows: 1, distinctPlates: 1, distinctVins: 1, value: 'TOYOTA' }],
      byBrandYear: [],
      byOrigin: [],
      topModels: [{ totalRows: 1, distinctPlates: 1, distinctVins: 1, brand: 'TOYOTA', model: 'CAMRY' }]
    }
    const report = buildExportReport(baseInput({ stats }), t)
    const rankings = report.sections.find(s => s.id === 'rankings')
    expect(rankings?.type).toBe('text')
    if (rankings?.type !== 'text') throw new Error('expected text section')
    expect(rankings.paragraphs).toEqual([
      '🏭 result.topBrand:1',
      '🚗 result.topModel:1',
      '🎨 result.topColor:1',
      '🗺️ result.topRegion:1'
    ])
  })

  it('omits the Rankings section when the vehicle does not place in any leaderboard', () => {
    const stats: StatsResponse = {
      summary: { totalRows: 0, distinctPlates: 0, distinctVins: 0, plateless: 0 },
      byYear: [],
      byRegion: [],
      byRegionYear: [],
      byBody: [],
      byKind: [],
      byColor: [],
      byFuel: [],
      byBrand: [],
      byBrandYear: [],
      byOrigin: [],
      topModels: []
    }
    const report = buildExportReport(baseInput({ stats }), t)
    expect(report.sections.find(s => s.id === 'rankings')).toBeUndefined()
  })

  it('renders plate and VIN registration history as separate table sections', () => {
    const report = buildExportReport(
      baseInput({
        plateHistoryActions: [registration({ dReg: '2019-01-01' }), registration({ dReg: '2020-01-01' })],
        vinHistoryActions: [registration({ dReg: '2018-06-01', plate: 'ВВ5678ВВ' })]
      }),
      t
    )
    const plateHistory = report.sections.find(s => s.id === 'historyPlate') as ExportTableSection | undefined
    const vinHistory = report.sections.find(s => s.id === 'historyVin') as ExportTableSection | undefined
    expect(plateHistory?.rows).toHaveLength(2)
    expect(vinHistory?.rows).toHaveLength(1)
    expect(vinHistory?.rows[0]).toContain('ВВ5678ВВ')
  })

  it('marks the applicable Euro NCAP rating and includes its report/pdf/video URLs', () => {
    const euroncap: EuroNcapRatingsResponse = {
      make: 'TOYOTA',
      model: 'CAMRY',
      year: 2020,
      applicableAssessmentId: 'a1',
      ratings: [
        {
          assessmentId: 'a1',
          url: 'https://euroncap.com/a1',
          testedVariant: 'Camry 2.5',
          bodyType: 'Sedan',
          ratingYear: 2019,
          stars: 5,
          adultOccupantPct: 90,
          childOccupantPct: 85,
          vulnerableRoadUsersPct: 70,
          safetyAssistPct: 80,
          safetyPack: false,
          frontImageUrl: 'https://data-cdn.euroncap.com/media/assessment-media/a1/front_0_.webp',
          images: [{ url: 'https://data-cdn.euroncap.com/media/assessment-media/a1/side_1_.webp', test: 'side' }],
          youtubeIds: ['abcdefghijk'],
          reportPdfUrl: 'https://euroncap.com/a1.pdf'
        }
      ]
    }
    const report = buildExportReport(baseInput({ euroncap }), t)
    const table = report.sections.find(s => s.id === 'euroncap') as ExportTableSection | undefined
    expect(table).toBeDefined()
    expect(table?.rows[0]?.[0]).toBe('export.yes')
    expect(table?.rows[0]).toContain('https://euroncap.com/a1')
    expect(table?.rows[0]).toContain('https://youtu.be/abcdefghijk')

    const images = report.sections.find(s => s.id === 'images')
    const videos = report.sections.find(s => s.id === 'videos')
    expect(images?.type).toBe('links')
    expect(videos?.type).toBe('links')
    if (images?.type === 'links') {
      const urls = images.links.map(l => l.url)
      expect(urls).toContain('https://data-cdn.euroncap.com/media/assessment-media/a1/front_0_.webp')
      expect(urls).toContain('https://data-cdn.euroncap.com/media/assessment-media/a1/side_1_.webp')
    }
    if (videos?.type === 'links') expect(videos.links.map(l => l.url)).toContain('https://youtu.be/abcdefghijk')
  })

  it('omits every ratings/coverage section when no source has any data', () => {
    const report = buildExportReport(baseInput(), t)
    expect(report.sections.some(s => s.id === 'safetyCoverage')).toBe(false)
    expect(report.sections.some(s => ['euroncap', 'nhtsa', 'jncap', 'cncap', 'kncap', 'iihs'].includes(s.id))).toBe(false)
  })
})

describe('buildLocalRecordsReport', () => {
  it('builds a single table section of value/label/date', () => {
    const report = buildLocalRecordsReport(
      'History',
      [
        { value: 'АА1234АА', label: 'My car', date: 1700000000000 },
        { value: 'JT123456789012345', label: null, date: 1700000001000 }
      ],
      t
    )
    expect(report.sections).toHaveLength(1)
    const section = report.sections[0]
    if (!section || section.type !== 'table') throw new Error('expected table section')
    expect(section.rows).toEqual([
      ['АА1234АА', 'My car', new Date(1700000000000).toLocaleString()],
      ['JT123456789012345', '—', new Date(1700000001000).toLocaleString()]
    ])
  })
})
