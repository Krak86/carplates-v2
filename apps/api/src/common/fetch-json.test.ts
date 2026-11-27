import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { FetchJsonError, fetchJson } from './fetch-json.js'

const schema = z.object({ ok: z.boolean() })
const opts = { timeoutMs: 1_000, maxBytes: 1_000 }

const stub = (impl: (url: unknown, init?: RequestInit) => Promise<Response>) => vi.stubGlobal('fetch', vi.fn(impl))

const kindOf = async (p: Promise<unknown>): Promise<string | undefined> => {
  try {
    await p
  } catch (err) {
    return err instanceof FetchJsonError ? err.kind : 'other'
  }
  return undefined
}

afterEach(() => vi.unstubAllGlobals())

describe('fetchJson', () => {
  it('returns the parsed body', async () => {
    stub(async () => new Response('{"ok":true,"extra":1}'))
    await expect(fetchJson('https://x.test', schema, opts)).resolves.toEqual({ ok: true })
  })

  it('passes init through and adds an abort signal', async () => {
    stub(async () => new Response('{"ok":true}'))
    await fetchJson('https://x.test', schema, { ...opts, init: { method: 'POST' } })
    const init = vi.mocked(fetch).mock.calls[0]?.[1]
    expect(init?.method).toBe('POST')
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('rejects a timeout', async () => {
    stub(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
        })
    )
    expect(await kindOf(fetchJson('https://x.test', schema, { ...opts, timeoutMs: 20 }))).toBe('timeout')
  })

  it('rejects a body over the cap while streaming (no Content-Length)', async () => {
    const big = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(400))
      }
    })
    stub(async () => new Response(big))
    expect(await kindOf(fetchJson('https://x.test', schema, opts))).toBe('too-large')
  })

  it('rejects a declared Content-Length over the cap without reading the body', async () => {
    stub(async () => new Response('{"ok":true}', { headers: { 'content-length': '999999' } }))
    expect(await kindOf(fetchJson('https://x.test', schema, opts))).toBe('too-large')
  })

  it('rejects a schema mismatch and invalid JSON', async () => {
    stub(async () => new Response('{"ok":"yes"}'))
    expect(await kindOf(fetchJson('https://x.test', schema, opts))).toBe('schema')
    stub(async () => new Response('<html>'))
    expect(await kindOf(fetchJson('https://x.test', schema, opts))).toBe('invalid-json')
  })

  it('reports the status of a non-ok answer and wraps network errors', async () => {
    stub(async () => new Response('{}', { status: 429 }))
    await expect(fetchJson('https://x.test', schema, opts)).rejects.toMatchObject({ kind: 'status', status: 429 })
    stub(async () => Promise.reject(new TypeError('fetch failed')))
    expect(await kindOf(fetchJson('https://x.test', schema, opts))).toBe('network')
  })
})
