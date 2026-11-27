import type { z } from 'zod'

export type FetchJsonFailure = 'network' | 'timeout' | 'status' | 'too-large' | 'invalid-json' | 'schema'

/** Why an upstream JSON call failed. `status` is set for `kind: 'status'` so a caller can map a 429 itself. */
export class FetchJsonError extends Error {
  constructor(
    readonly kind: FetchJsonFailure,
    message: string,
    readonly status?: number
  ) {
    super(message)
    this.name = 'FetchJsonError'
  }
}

export type FetchJsonOptions = {
  /** Covers the connection and the whole body read. */
  timeoutMs: number
  /** Hard cap on the response body, checked against `Content-Length` and again while streaming. */
  maxBytes: number
  init?: Omit<RequestInit, 'signal'>
}

/** Default caps for small JSON APIs (ratings, decodes, search hits). */
export const DEFAULT_JSON_MAX_BYTES = 2 * 1024 * 1024

const readCapped = async (res: Response, maxBytes: number): Promise<string> => {
  const declared = Number(res.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) {
    await res.body?.cancel().catch(() => undefined)
    throw new FetchJsonError('too-large', `response of ${declared} bytes exceeds ${maxBytes}`)
  }
  if (!res.body) {
    const text = await res.text()
    if (Buffer.byteLength(text) > maxBytes) throw new FetchJsonError('too-large', `response exceeds ${maxBytes} bytes`)
    return text
  }
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined)
      throw new FetchJsonError('too-large', `response exceeds ${maxBytes} bytes`)
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString('utf8')
}

const isTimeout = (err: unknown): boolean =>
  err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')

/**
 * The one way the api reads JSON from an upstream: a timeout over the whole exchange, a byte cap on the body and a Zod
 * parse of the result (`as` casts of foreign data are what this replaces). Never returns unvalidated data; throws
 * `FetchJsonError` whose message carries no response content, so callers log it and answer with a fixed string.
 */
export async function fetchJson<S extends z.ZodType>(
  url: string | URL,
  schema: S,
  { timeoutMs, maxBytes, init }: FetchJsonOptions
): Promise<z.infer<S>> {
  let text: string
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
    if (!res.ok) {
      await res.body?.cancel().catch(() => undefined)
      throw new FetchJsonError('status', `status ${res.status}`, res.status)
    }
    text = await readCapped(res, maxBytes)
  } catch (err) {
    if (err instanceof FetchJsonError) throw err
    if (isTimeout(err)) throw new FetchJsonError('timeout', `no answer within ${timeoutMs} ms`)
    throw new FetchJsonError('network', err instanceof Error ? err.message : String(err))
  }

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    throw new FetchJsonError('invalid-json', 'response is not JSON')
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new FetchJsonError('schema', 'response does not match the expected shape')
  return parsed.data
}
