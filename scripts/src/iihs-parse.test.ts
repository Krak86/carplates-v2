import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { parseVehiclePage } from './iihs-parse.js'

const fixture = (name: string): string => readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8')

describe('parseVehiclePage', () => {
  it('parses a current "updated test" era page with a two-row pedestrian FCP test and a LATCH "+" grade', () => {
    const row = parseVehiclePage(fixture('iihs-accord-2026.html'), 'honda/accord-4-door-sedan/2026')
    expect(row).toMatchObject({
      assessmentId: 'honda/accord-4-door-sedan/2026',
      make: 'Honda',
      model: 'Accord',
      makeKey: 'honda',
      modelKey: 'accord',
      vehicleClass: 'midsize car',
      variantType: '4-door sedan',
      modelYear: 2026,
      award: 'TSP',
      imageUrl: 'https://www.iihs.org/cdn-cgi/image/width=636/api/ratings/model-year-images/3252/'
    })
    expect(row?.tests).toEqual([
      { key: 'small-overlap-front', label: 'Small overlap front', rating: 'Good', qualifier: null },
      { key: 'moderate-overlap-front-updated-test', label: 'Moderate overlap front: updated test', rating: 'Good', qualifier: null },
      { key: 'side-updated-test', label: 'Side: updated test', rating: 'Good', qualifier: null },
      { key: 'headlights', label: 'Headlights', rating: 'Good', qualifier: null },
      {
        key: 'front-crash-prevention-pedestrian',
        label: 'Front crash prevention: pedestrian',
        rating: 'Acceptable',
        qualifier: 'Standard system'
      },
      { key: 'seat-belt-reminders', label: 'Seat belt reminders', rating: 'Good', qualifier: null },
      { key: 'child-seat-anchors', label: 'LATCH ease of use', rating: 'Good+', qualifier: null }
    ])
  })

  it('parses an "original test" era page (driver/passenger split, roof strength, optional V2V FCP on the Superior/Advanced/Basic scale)', () => {
    const row = parseVehiclePage(fixture('iihs-accord-2015.html'), 'honda/accord-4-door-sedan/2015')
    expect(row).toMatchObject({
      make: 'Honda',
      model: 'Accord',
      modelYear: 2015,
      award: 'TSP'
    })
    expect(row?.tests).toEqual([
      { key: 'small-overlap-front-driver-side', label: 'Small overlap front: driver-side', rating: 'Good', qualifier: null },
      {
        key: 'small-overlap-front-passenger-side',
        label: 'Small overlap front: passenger-side',
        rating: 'Good',
        qualifier: null
      },
      { key: 'moderate-overlap-front-original-test', label: 'Moderate overlap front: original test', rating: 'Good', qualifier: null },
      { key: 'side-original-test', label: 'Side: original test', rating: 'Good', qualifier: null },
      { key: 'roof-strength', label: 'Roof strength', rating: 'Good', qualifier: null },
      { key: 'head-restraints-and-seats', label: 'Head restraints & seats', rating: 'Good', qualifier: null },
      {
        key: 'front-crash-prevention-vehicle-to-vehicle',
        label: 'Front crash prevention: vehicle-to-vehicle',
        rating: 'Basic',
        qualifier: 'Optional system'
      },
      { key: 'child-seat-anchors', label: 'LATCH ease of use', rating: 'Marginal', qualifier: null }
    ])
  })

  it('parses the earliest testing era: a single test, no crash-avoidance/seat-belt sections, no award, no image', () => {
    const row = parseVehiclePage(fixture('iihs-golf-1994.html'), 'volkswagen/golf-4-door-hatchback/1994')
    expect(row).toMatchObject({
      make: 'Volkswagen',
      model: 'Golf',
      makeKey: 'volkswagen',
      modelKey: 'golf',
      vehicleClass: 'small car',
      variantType: '4-door hatchback',
      modelYear: 1994,
      award: null,
      imageUrl: null
    })
    expect(row?.tests).toEqual([
      { key: 'moderate-overlap-front-original-test', label: 'Moderate overlap front: original test', rating: 'Marginal', qualifier: null }
    ])
  })

  it('splits a hyphenated two-word make from a hyphenated model, and maps a "Not tested" FCP result to a null rating', () => {
    const row = parseVehiclePage(fixture('iihs-e-class-2020.html'), 'mercedes-benz/e-class-2-door-coupe/2020')
    expect(row).toMatchObject({
      make: 'Mercedes-Benz',
      model: 'E-Class',
      makeKey: 'mercedesbenz',
      modelKey: 'eclass',
      vehicleClass: 'large luxury car',
      variantType: '2-door coupe',
      modelYear: 2020,
      award: null,
      imageUrl: null
    })
    expect(row?.tests).toEqual([
      {
        key: 'front-crash-prevention-vehicle-to-vehicle',
        label: 'Front crash prevention: vehicle-to-vehicle',
        rating: null,
        qualifier: 'Standard system'
      }
    ])
  })

  it('drops a page whose make cannot be resolved against the URL slug', () => {
    const row = parseVehiclePage(fixture('iihs-accord-2026.html'), 'toyota/accord-4-door-sedan/2026')
    expect(row).toBeNull()
  })
})
