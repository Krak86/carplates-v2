import { BadGatewayException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mapRecalls, parseNhtsaDate, summarizeComplaints } from './nhtsa-parse.js'
import { NhtsaService } from './nhtsa.service.js'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

const RECALL = {
  Manufacturer: 'Toyota Motor Engineering & Manufacturing',
  NHTSACampaignNumber: '15V144000',
  parkIt: false,
  parkOutSide: false,
  overTheAirUpdate: false,
  ReportReceivedDate: '13/03/2015',
  Component: 'STEERING:ELECTRIC POWER ASSIST SYSTEM',
  Summary: 'Toyota is recalling   certain vehicles.',
  Consequence: 'Loss of power steering.',
  Remedy: 'Dealers will replace the ECU.',
  Model: 'CAMRY'
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('parseNhtsaDate', () => {
  it('reads recall dates as dd/mm/yyyy and complaint dates as mm/dd/yyyy', () => {
    expect(parseNhtsaDate('13/03/2015', 'dmy')).toBe('2015-03-13')
    expect(parseNhtsaDate('08/21/2026', 'mdy')).toBe('2026-08-21')
  })

  it('returns null for garbage', () => {
    expect(parseNhtsaDate('2015-03-13', 'dmy')).toBeNull()
    expect(parseNhtsaDate('31/31/2015', 'dmy')).toBeNull()
    expect(parseNhtsaDate(null, 'mdy')).toBeNull()
  })
})

describe('mapRecalls', () => {
  it('lists a campaign once, newest first, with collapsed whitespace', () => {
    const older = { ...RECALL, NHTSACampaignNumber: '10V001000', ReportReceivedDate: '01/02/2010' }
    const { total, recalls } = mapRecalls([older, RECALL, RECALL])
    expect(total).toBe(2)
    expect(recalls.map(r => r.code)).toEqual(['15V144000', '10V001000'])
    expect(recalls[0]?.summary).toBe('Toyota is recalling certain vehicles.')
  })
})

describe('summarizeComplaints', () => {
  it('counts crashes, fires, injuries, deaths and ranks components', () => {
    const summary = summarizeComplaints([
      {
        crash: true,
        fire: false,
        numberOfInjuries: 4,
        numberOfDeaths: 1,
        dateComplaintFiled: '09/02/2026',
        components: 'AIR BAGS, ELECTRICAL SYSTEM'
      },
      {
        crash: false,
        fire: true,
        numberOfInjuries: 0,
        numberOfDeaths: 0,
        dateComplaintFiled: '09/04/2026',
        components: 'ELECTRICAL SYSTEM'
      }
    ])
    expect(summary).toMatchObject({ total: 2, crashes: 1, fires: 1, injuries: 4, deaths: 1, latestFiled: '2026-09-04' })
    expect(summary.components[0]).toEqual({ name: 'ELECTRICAL SYSTEM', count: 2 })
  })
})

describe('NhtsaService', () => {
  it('retries the Mazda digit spelling and caches the answer', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      // NHTSA really answers an unknown model with HTTP 400 and an empty list.
      .mockResolvedValueOnce(jsonResponse({ Count: 0, results: [] }, 400))
      .mockResolvedValueOnce(jsonResponse({ Count: 1, results: [RECALL] }))

    const service = new NhtsaService()
    const first = await service.recalls('MAZDA', '6', 2015)
    const second = await service.recalls('MAZDA', '6', 2015)

    expect(first.matchedModel).toBe('Mazda6')
    expect(first.total).toBe(1)
    expect(second).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns an empty answer when no spelling matches', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ Count: 0, results: [] }))
    const result = await new NhtsaService().complaints('ЗАЗ', 'LANOS', 2008)
    expect(result).toMatchObject({ matchedModel: null, total: 0, components: [] })
  })

  it('maps an upstream failure to 502 and does not cache it', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 500)).mockResolvedValueOnce(jsonResponse({ results: [RECALL] }))

    const service = new NhtsaService()
    await expect(service.recalls('Toyota', 'Camry', 2015)).rejects.toBeInstanceOf(BadGatewayException)
    await expect(service.recalls('Toyota', 'Camry', 2015)).resolves.toMatchObject({ total: 1 })
  })
})
