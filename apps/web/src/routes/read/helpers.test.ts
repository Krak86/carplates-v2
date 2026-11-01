import type { SizeModel } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import type { ArticleMeta } from '@/routes/read/types'
import {
  articleTopics,
  displayModel,
  filterArticles,
  filterProfiles,
  fleetBySegment,
  parseOneOf,
  profileModel,
  segmentRange,
  topOfSegment
} from '@/routes/read/helpers'

const model = (over: Partial<SizeModel>): SizeModel => ({ brand: 'SKODA', model: 'OCTAVIA', n: 100, ...over })

describe('profileModel', () => {
  it('separates SUVs from wagons: RDW refines the registry "УНІВЕРСАЛ"', () => {
    const rav4 = profileModel(
      model({ brand: 'TOYOTA', model: 'RAV4', body: 'УНІВЕРСАЛ', rdwBody: 'terreinvoertuig', lengthMm: 4600 })
    )
    expect(rav4.shape).toBe('suv')
    expect(rav4.cls?.cls).toBe('J')
    expect(profileModel(model({ body: 'УНІВЕРСАЛ', rdwBody: 'stationwagen', lengthMm: 4670 })).shape).toBe('wagon')
  })

  it('keeps the registry body of the fleet over a noisy RDW tally', () => {
    expect(
      profileModel(model({ brand: 'VOLKSWAGEN', model: 'PASSAT', body: 'СЕДАН', rdwBody: 'stationwagen' })).shape
    ).toBe('sedan')
  })

  it('places named crossovers and vans, whatever the sources say', () => {
    expect(profileModel(model({ brand: 'HYUNDAI', model: 'TUCSON', body: 'УНІВЕРСАЛ', rdwBody: 'MPV' })).shape).toBe(
      'suv'
    )
    expect(profileModel(model({ brand: 'TOYOTA', model: 'LAND CRUISER PRADO', body: 'УНІВЕРСАЛ' })).shape).toBe('suv')
    expect(profileModel(model({ brand: 'VOLKSWAGEN', model: 'TRANSPORTER', body: 'ПАСАЖИРСЬКИЙ' })).shape).toBe('van')
    expect(profileModel(model({ brand: 'OPEL', model: 'ZAFIRA', body: 'УНІВЕРСАЛ', rdwBody: 'MPV' })).shape).toBe('mpv')
  })

  it('falls back to a registry wagon, then to the generic car outline', () => {
    expect(profileModel(model({ body: 'УНІВЕРСАЛ', lengthMm: 4880 })).shape).toBe('wagon')
    const unknown = profileModel(model({ body: null }))
    expect(unknown.shape).toBe('car')
    expect(unknown.shapeKnown).toBe(false)
  })

  it('has no segment without a length', () => {
    expect(profileModel(model({ rdwBody: 'hatchback' })).cls).toBeNull()
  })
})

describe('filterProfiles', () => {
  const profiles = [
    profileModel(model({ model: 'GOLF', n: 300, rdwBody: 'hatchback', lengthMm: 4250 })),
    profileModel(model({ brand: 'TOYOTA', model: 'RAV4', n: 200, rdwBody: 'terreinvoertuig', lengthMm: 4600 })),
    profileModel(model({ brand: 'TOYOTA', model: 'CAMRY', n: 500, rdwBody: 'sedan' }))
  ]

  it('filters by shape, segment and text, biggest fleet first', () => {
    expect(filterProfiles(profiles, { shape: null, cls: null, text: '' }).map(p => p.model.model)).toEqual([
      'CAMRY',
      'GOLF',
      'RAV4'
    ])
    expect(filterProfiles(profiles, { shape: 'suv', cls: null, text: '' }).map(p => p.model.model)).toEqual(['RAV4'])
    expect(filterProfiles(profiles, { shape: null, cls: null, text: 'toyota' })).toHaveLength(2)
    expect(filterProfiles(profiles, { shape: null, cls: 'C', text: '' }).map(p => p.model.model)).toEqual(['GOLF'])
  })

  it('ranks a segment and counts the cars it cannot place', () => {
    expect(topOfSegment(profiles, 'J', 3).map(p => p.model.model)).toEqual(['RAV4'])
    const { byClass, unplaced } = fleetBySegment(profiles)
    expect(byClass.get('C')).toBe(300)
    expect(unplaced).toBe(500)
  })
})

describe('labels and ranges', () => {
  it('title-cases models but keeps digit names and acronyms upper-case', () => {
    expect(displayModel('LAND CRUISER PRADO')).toBe('Land Cruiser Prado')
    expect(displayModel('RAV4')).toBe('RAV4')
    expect(displayModel('A4 ALLROAD')).toBe('A4 Allroad')
    expect(displayModel('CR-V')).toBe('CR-V')
    expect(displayModel('X-TRAIL')).toBe('X-Trail')
  })

  it('reads the length range of a segment from the cut tables', () => {
    expect(segmentRange('A', 'compact')).toEqual({ fromMm: null, toMm: 3800 })
    expect(segmentRange('C', 'compact')).toEqual({ fromMm: 4200, toMm: 4500 })
    expect(segmentRange('F', 'long')).toEqual({ fromMm: 5100, toMm: null })
    expect(segmentRange('J', 'compact')).toBeNull()
  })

  it('accepts only known list values', () => {
    expect(parseOneOf('suv', ['suv', 'van'] as const)).toBe('suv')
    expect(parseOneOf('boat', ['suv', 'van'] as const)).toBeNull()
    expect(parseOneOf(null, ['suv'] as const)).toBeNull()
  })
})

const article = (path: string, lead: string, tags: string[]): ArticleMeta => ({
  path,
  icon: '📘',
  titleKey: `nav.${path}`,
  hue: 0,
  lead: { ua: lead, ru: lead, en: lead },
  tags: tags.map(tag => ({ ua: tag, ru: tag, en: tag }))
})

const GUIDES = [
  article('fuel', 'What we run on', ['Fuel', 'Emissions']),
  article('fleet', 'Colours and age', ['Fleet', 'Fuel']),
  article('vin', 'Read a VIN', ['VIN'])
]
const TITLES: Record<string, string> = { fuel: 'Fuel and CO2', fleet: 'What Ukraine drives', vin: 'VIN explained' }
const titleOf = (a: ArticleMeta): string => TITLES[a.path] ?? ''

describe('articleTopics', () => {
  it('lists each tag once, the most used first', () => {
    expect(articleTopics(GUIDES).map(t => t.en)).toEqual(['Fuel', 'Emissions', 'Fleet', 'VIN'])
  })
})

describe('filterArticles', () => {
  it('returns everything for an empty search and topic', () => {
    expect(filterArticles(GUIDES, ' ', '', 'en', titleOf)).toHaveLength(3)
  })

  it('narrows by topic', () => {
    expect(filterArticles(GUIDES, '', 'Fuel', 'en', titleOf).map(a => a.path)).toEqual(['fuel', 'fleet'])
  })

  it('searches title, lead and tags case-insensitively, combined with the topic', () => {
    expect(filterArticles(GUIDES, 'DRIVES', '', 'en', titleOf).map(a => a.path)).toEqual(['fleet'])
    expect(filterArticles(GUIDES, 'colours', '', 'en', titleOf).map(a => a.path)).toEqual(['fleet'])
    expect(filterArticles(GUIDES, 'emissions', '', 'en', titleOf).map(a => a.path)).toEqual(['fuel'])
    expect(filterArticles(GUIDES, 'vin', 'Fuel', 'en', titleOf)).toEqual([])
  })
})
