import { encodeJpeg, MAX_DIMENSION } from '@/lib/image-encode'

export { MAX_DIMENSION }

function toUploadFile(blob: Blob): File {
  return new File([blob], 'plate.jpg', { type: 'image/jpeg' })
}

/** One-shot worker; null = unsupported or the worker failed, so the caller falls back to the main thread. */
function shrinkInWorker(file: File): Promise<Blob | null> {
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return Promise.resolve(null)
  return new Promise(resolve => {
    let worker: Worker
    try {
      worker = new Worker(new URL('./image.worker.ts', import.meta.url), { type: 'module' })
    } catch {
      resolve(null)
      return
    }
    const done = (blob: Blob | null): void => {
      worker.terminate()
      resolve(blob)
    }
    worker.onmessage = (event: MessageEvent<Blob | null>): void => done(event.data)
    worker.onerror = (): void => done(null)
    worker.postMessage(file)
  })
}

/**
 * Downscales (max side 4608 px: a 3200 cap cost reads on 4000 px phone photos) + re-encodes to a JPEG of at most ~2.5 MB before upload,
 * in a worker when the browser has OffscreenCanvas (a 12 MP photo otherwise blocks the UI). Falls back to the main thread, then to the
 * original file if the browser can't decode it (e.g. an exotic format) — the server's mimetype allowlist then gives a clear error instead.
 */
export async function shrinkImage(file: File): Promise<File> {
  const fromWorker = await shrinkInWorker(file)
  if (fromWorker) return toUploadFile(fromWorker)

  try {
    return toUploadFile(await encodeJpeg(await createImageBitmap(file)))
  } catch {
    return file
  }
}
