import { ServiceUnavailableException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.hoisted(() => vi.fn())
const ctorMock = vi.hoisted(() => vi.fn())

vi.mock('aws4fetch', () => ({
  AwsClient: class {
    constructor(opts: unknown) {
      ctorMock(opts)
    }
    fetch = fetchMock
  }
}))

import type { Env } from '../env.js'
import { R2ObjectStore, createShareObjectStore } from './r2-object-store.js'

const store = () => new R2ObjectStore('https://acct.r2.cloudflarestorage.com/', 'carsua-shares', 'key-id', 'secret')

beforeEach(() => {
  fetchMock.mockReset()
  ctorMock.mockClear()
})

describe('R2ObjectStore', () => {
  it('signs for S3 on region auto with the bucket-scoped credentials', () => {
    store()
    expect(ctorMock).toHaveBeenCalledWith(
      expect.objectContaining({ accessKeyId: 'key-id', secretAccessKey: 'secret', service: 's3', region: 'auto' })
    )
  })

  it('PUTs the bytes to <endpoint>/<bucket>/<key> with a content type', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))
    await store().put('shares/abc.jpg', Buffer.from('jpeg'), 'image/jpeg')
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('https://acct.r2.cloudflarestorage.com/carsua-shares/shares/abc.jpg')
    expect(init).toMatchObject({ method: 'PUT', headers: { 'content-type': 'image/jpeg' } })
    expect(Buffer.from(init.body as Uint8Array).toString()).toBe('jpeg')
  })

  it('throws when the PUT fails, so no row is written for a missing object', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }))
    await expect(store().put('shares/a.jpg', Buffer.from('x'), 'image/jpeg')).rejects.toThrow('status 500')
  })

  it('GET streams the object and reports its length; a 404 is null', async () => {
    fetchMock.mockResolvedValueOnce(new Response('jpeg-bytes', { status: 200, headers: { 'content-length': '10' } }))
    const hit = await store().get('shares/a.jpg')
    expect(hit?.length).toBe(10)
    const chunks: Buffer[] = []
    for await (const c of hit?.stream ?? []) chunks.push(c as Buffer)
    expect(Buffer.concat(chunks).toString()).toBe('jpeg-bytes')

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }))
    expect(await store().get('shares/missing.jpg')).toBeNull()
  })

  it('DELETE treats a missing object as done and any other failure as an error', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    await expect(store().delete('shares/a.jpg')).resolves.toBeUndefined()
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }))
    await expect(store().delete('shares/a.jpg')).resolves.toBeUndefined()
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }))
    await expect(store().delete('shares/a.jpg')).rejects.toThrow('status 403')
  })
})

describe('createShareObjectStore', () => {
  const base = { SHARES_R2_BUCKET: 'carsua-shares' } as Env

  it('is an R2 store when endpoint and both keys are set', () => {
    const env = {
      ...base,
      SHARES_R2_ENDPOINT: 'https://x',
      SHARES_R2_ACCESS_KEY_ID: 'a',
      SHARES_R2_SECRET_ACCESS_KEY: 'b'
    } as Env
    expect(createShareObjectStore(env)).toBeInstanceOf(R2ObjectStore)
  })

  it('refuses to store or read, but deletes quietly, while not configured', async () => {
    const unconfigured = createShareObjectStore(base)
    await expect(unconfigured.put('k', Buffer.from('x'), 'image/jpeg')).rejects.toBeInstanceOf(
      ServiceUnavailableException
    )
    await expect(unconfigured.get('k')).rejects.toBeInstanceOf(ServiceUnavailableException)
    await expect(unconfigured.delete('k')).resolves.toBeUndefined()
  })
})
