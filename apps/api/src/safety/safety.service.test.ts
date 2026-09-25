import { BadGatewayException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SafetyService } from './safety.service.js'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('SafetyService', () => {
  it('resolves variant ids then maps their ratings', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse({ Count: 1, Results: [{ VehicleId: 9403 }] })).mockResolvedValueOnce(
      jsonResponse({
        Count: 1,
        Results: [
          {
            VehicleId: 9403,
            VehicleDescription: '2015 Audi A3 4 DR AWD',
            OverallRating: '5',
            OverallFrontCrashRating: '4',
            FrontCrashDriversideRating: '4',
            FrontCrashPassengersideRating: '5',
            FrontCrashPicture: 'https://static.nhtsa.gov/front.jpg',
            FrontCrashVideo: 'https://static.nhtsa.gov/front.wmv',
            OverallSideCrashRating: '5',
            SideCrashDriversideRating: '5',
            SideCrashPassengersideRating: '5',
            SideCrashPicture: null,
            SideCrashVideo: null,
            RolloverRating: '4',
            RolloverRating2: 'Not Rated',
            RolloverPossibility: 0.109,
            RolloverPossibility2: null,
            dynamicTipResult: 'No Tip',
            SidePoleCrashRating: '5',
            SidePolePicture: null,
            SidePoleVideo: null,
            'combinedSideBarrierAndPoleRating-Front': '5',
            'combinedSideBarrierAndPoleRating-Rear': '5',
            'sideBarrierRating-Overall': '5',
            NHTSAElectronicStabilityControl: 'Standard',
            NHTSAForwardCollisionWarning: 'Optional',
            NHTSALaneDepartureWarning: 'Optional',
            ComplaintsCount: 179,
            RecallsCount: 7,
            InvestigationCount: 1
          }
        ]
      })
    )

    const service = new SafetyService()
    const result = await service.ratings('Audi', 'A3', 2015)

    expect(result.make).toBe('Audi')
    expect(result.ratings).toHaveLength(1)
    expect(result.ratings[0]).toMatchObject({
      vehicleId: 9403,
      description: '2015 Audi A3 4 DR AWD',
      overallRating: '5',
      rolloverPossibility: 0.109,
      rolloverRating2: 'Not Rated',
      dynamicTipResult: 'No Tip',
      combinedSideBarrierAndPoleRatingFront: '5',
      combinedSideBarrierAndPoleRatingRear: '5',
      sideBarrierRatingOverall: '5',
      complaintsCount: 179,
      recallsCount: 7
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('retries with the "Mazda6"-style name when the bare registry model ("6") misses', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ Count: 0, Results: [] })) // model=6 → miss
      .mockResolvedValueOnce(jsonResponse({ Count: 1, Results: [{ VehicleId: 10009 }] })) // model=Mazda6 → hit
      .mockResolvedValueOnce(
        jsonResponse({ Count: 1, Results: [{ VehicleId: 10009, VehicleDescription: '2016 Mazda Mazda6 4 DR FWD' }] })
      )

    const service = new SafetyService()
    const result = await service.ratings('MAZDA', '6', 2016)

    expect(result.ratings).toHaveLength(1)
    expect(result.ratings[0]).toMatchObject({ vehicleId: 10009, description: '2016 Mazda Mazda6 4 DR FWD' })
    const urls = fetchMock.mock.calls.map(([url]) => String(url))
    expect(urls[0]).toContain('model/6')
    expect(urls[1]).toContain('model/Mazda6')
  })

  it('retries with the "<LETTERS>-CLASS" name for a Mercedes-Benz trim code', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ Count: 0, Results: [] })) // model=E 200 → miss
      .mockResolvedValueOnce(jsonResponse({ Count: 1, Results: [{ VehicleId: 9224 }] })) // model=E-CLASS → hit
      .mockResolvedValueOnce(
        jsonResponse({
          Count: 1,
          Results: [{ VehicleId: 9224, VehicleDescription: '2015 Mercedes-Benz E-Class 4 DR RWD' }]
        })
      )

    const service = new SafetyService()
    const result = await service.ratings('Mercedes-Benz', 'E 200', 2015)

    expect(result.ratings).toHaveLength(1)
    expect(result.ratings[0]).toMatchObject({ vehicleId: 9224 })
    const urls = fetchMock.mock.calls.map(([url]) => String(url))
    expect(urls[0]).toContain('model/E%20200')
    expect(urls[1]).toContain('model/E-CLASS')
  })

  it('does not add a "-CLASS" candidate for a one-word Mercedes-Benz model', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse({ Count: 0, Results: [] })) // model=Sprinter → miss

    const service = new SafetyService()
    const result = await service.ratings('Mercedes-Benz', 'Sprinter', 2015)

    expect(result.ratings).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to the leading word when a trim suffix breaks the exact match', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ Count: 0, Results: [] })) // model=Focus Titanium → miss
      .mockResolvedValueOnce(jsonResponse({ Count: 1, Results: [{ VehicleId: 5555 }] })) // model=Focus → hit
      .mockResolvedValueOnce(
        jsonResponse({ Count: 1, Results: [{ VehicleId: 5555, VehicleDescription: '2015 Ford Focus 4 DR FWD' }] })
      )

    const service = new SafetyService()
    const result = await service.ratings('Ford', 'Focus Titanium', 2015)

    expect(result.ratings).toHaveLength(1)
    const urls = fetchMock.mock.calls.map(([url]) => String(url))
    expect(urls[0]).toContain('model/Focus%20Titanium')
    expect(urls[1]).toContain('model/Focus')
  })

  it('returns an empty ratings array when no variant matches, without throwing', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ Count: 0, Results: [] }))
    const service = new SafetyService()

    const result = await service.ratings('Lada', 'Samara', 1998)

    expect(result).toEqual({ make: 'Lada', model: 'Samara', year: 1998, ratings: [] })
  })

  it('caches by make/model/year and does not call fetch again', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(jsonResponse({ Count: 0, Results: [] }))
    const service = new SafetyService()

    await service.ratings('Kia', 'Ceed', 2020)
    await service.ratings('Kia', 'Ceed', 2020)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws BadGatewayException on a non-ok upstream response', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, 500))
    const service = new SafetyService()
    await expect(service.ratings('Kia', 'Ceed', 2020)).rejects.toBeInstanceOf(BadGatewayException)
  })
})
