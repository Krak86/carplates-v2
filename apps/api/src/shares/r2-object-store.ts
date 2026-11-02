import { Readable } from 'node:stream'

import { ServiceUnavailableException } from '@nestjs/common'
import { AwsClient } from 'aws4fetch'

import { sharesStorageConfigured } from '../env.js'
import type { Env } from '../env.js'
import type { ShareObjectStore } from './types.js'

const REQUEST_TIMEOUT_MS = 15_000

/** Cloudflare R2 over its S3 API (SigV4 via aws4fetch: no AWS SDK, objects are small and private). */
export class R2ObjectStore implements ShareObjectStore {
  private readonly client: AwsClient
  private readonly base: string

  constructor(endpoint: string, bucket: string, accessKeyId: string, secretAccessKey: string) {
    this.client = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: 'auto', retries: 2 })
    this.base = `${endpoint.replace(/\/+$/, '')}/${bucket}`
  }

  private url(key: string): string {
    return `${this.base}/${key.split('/').map(encodeURIComponent).join('/')}`
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    const res = await this.client.fetch(this.url(key), {
      method: 'PUT',
      body: new Uint8Array(body),
      headers: { 'content-type': contentType },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
    if (!res.ok) throw new Error(`R2 put failed: status ${res.status}`)
  }

  async get(key: string): Promise<{ stream: Readable; length: number | null } | null> {
    const res = await this.client.fetch(this.url(key), { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    if (res.status === 404) return null
    if (!res.ok || !res.body) throw new Error(`R2 get failed: status ${res.status}`)
    const length = Number(res.headers.get('content-length'))
    return { stream: Readable.fromWeb(res.body), length: Number.isFinite(length) && length > 0 ? length : null }
  }

  async delete(key: string): Promise<void> {
    const res = await this.client.fetch(this.url(key), {
      method: 'DELETE',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
    if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed: status ${res.status}`)
  }
}

/** Stands in while the bucket is not configured: nothing can have been stored, so a delete is a no-op. */
const unconfiguredStore: ShareObjectStore = {
  put: () => Promise.reject(new ServiceUnavailableException('Sharing is not configured')),
  get: () => Promise.reject(new ServiceUnavailableException('Sharing is not configured')),
  delete: () => Promise.resolve()
}

export function createShareObjectStore(env: Env): ShareObjectStore {
  if (!sharesStorageConfigured(env)) return unconfiguredStore
  return new R2ObjectStore(
    env.SHARES_R2_ENDPOINT as string,
    env.SHARES_R2_BUCKET,
    env.SHARES_R2_ACCESS_KEY_ID as string,
    env.SHARES_R2_SECRET_ACCESS_KEY as string
  )
}
