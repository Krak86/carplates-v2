import type { CallHandler, ExecutionContext } from '@nestjs/common'
import { firstValueFrom, from, mergeAll, of, throwError } from 'rxjs'
import { describe, expect, it } from 'vitest'

import { LOOKUP_CACHE, lookupCacheInterceptor } from './cache.js'

const run = async (query: Record<string, string>, handler: CallHandler) => {
  const header = new Map<string, string>()
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ query }),
      getResponse: () => ({ header: (k: string, v: string) => header.set(k, v) })
    })
  } as unknown as ExecutionContext
  const Interceptor = lookupCacheInterceptor(LOOKUP_CACHE)
  await firstValueFrom(from(Promise.resolve(new Interceptor().intercept(context, handler))).pipe(mergeAll())).catch(
    () => undefined
  )
  return header.get('cache-control')
}

describe('lookupCacheInterceptor', () => {
  it('sets the value on success', async () => {
    expect(await run({ brand: 'Toyota' }, { handle: () => of(1) })).toBe(LOOKUP_CACHE)
  })
  it('sends no-store for refresh=true', async () => {
    expect(await run({ refresh: 'true' }, { handle: () => of(1) })).toBe('no-store')
  })
  it('sets nothing when the handler fails', async () => {
    expect(await run({}, { handle: () => throwError(() => new Error('x')) })).toBeUndefined()
  })
})
