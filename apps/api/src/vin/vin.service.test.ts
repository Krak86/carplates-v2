import { BadGatewayException } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { VinService } from './vin.service.js'

const VIN = 'KNDPMCAC7H7153233'
const registry = { vin: VIN, current: {}, history: [] }

const make = (found: boolean) => {
  const service = new VinService({ db: {} } as never, { recordVin: vi.fn() } as never)
  vi.spyOn(service as never as { lookupRegistry: () => unknown }, 'lookupRegistry').mockResolvedValue(
    found ? registry : undefined
  )
  return service
}

describe('VinService.decode when NHTSA is down', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('answers with the registry rows instead of a 502, and does not cache the empty decode', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })))
    const service = make(true)
    await expect(service.decode(VIN)).resolves.toMatchObject({ vin: VIN, results: [], registry })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ Results: [{ Variable: 'Make', Value: 'KIA' }] })))
    )
    await expect(service.decode(VIN)).resolves.toMatchObject({ results: [{ variable: 'Make', value: 'KIA' }] })
  })

  it('still throws 502 when the registry does not know the VIN', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })))
    await expect(make(false).decode(VIN)).rejects.toBeInstanceOf(BadGatewayException)
  })
})
