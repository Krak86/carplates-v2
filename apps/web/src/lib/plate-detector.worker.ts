import * as ort from 'onnxruntime-web/wasm'
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'

import {
  DETECTOR_INPUT_SIZE,
  DETECTOR_MIN_SCORE,
  DETECTOR_MODEL_URL,
  type DetectorRequest,
  type DetectorResponse,
  type PlateBox
} from './plate-detector-types'

// Same preprocessing as open-image-models' YOLOv9 (letterbox to 384², grey 114 padding, RGB, 0-1), so the
// browser box matches what the server detector would find. The model has NMS built in: output0 is [N, 7] rows of
// [batchIdx, x1, y1, x2, y2, classId, score] in letterboxed pixels.
const SIZE = DETECTOR_INPUT_SIZE
const ROW = 7

type WorkerScope = {
  onmessage: ((event: MessageEvent<DetectorRequest>) => void) | null
  postMessage: (message: DetectorResponse) => void
}
const ctx = self as unknown as WorkerScope

const canvas = new OffscreenCanvas(SIZE, SIZE)
const g = canvas.getContext('2d', { willReadFrequently: true })
const input = new Float32Array(3 * SIZE * SIZE)

ort.env.wasm.numThreads = 1 // multi-thread needs cross-origin isolation (COOP/COEP) — not worth it for a 7 MB model
ort.env.wasm.wasmPaths = { wasm: wasmUrl }

const sessionPromise = ort.InferenceSession.create(DETECTOR_MODEL_URL, { executionProviders: ['wasm'] })

sessionPromise.then(
  () => ctx.postMessage({ type: 'ready' }),
  (err: unknown) => ctx.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) })
)

function preprocess(frame: ImageBitmap): { ratio: number; dw: number; dh: number } {
  const ratio = Math.min(SIZE / frame.height, SIZE / frame.width)
  const w = Math.round(frame.width * ratio)
  const h = Math.round(frame.height * ratio)
  const dw = (SIZE - w) / 2
  const dh = (SIZE - h) / 2
  if (!g) throw new Error('OffscreenCanvas 2d context unavailable')
  g.fillStyle = 'rgb(114,114,114)'
  g.fillRect(0, 0, SIZE, SIZE)
  g.drawImage(frame, Math.round(dw), Math.round(dh), w, h)

  const { data } = g.getImageData(0, 0, SIZE, SIZE)
  const plane = SIZE * SIZE
  for (let i = 0, p = 0; i < plane; i++, p += 4) {
    input[i] = data[p]! / 255
    input[plane + i] = data[p + 1]! / 255
    input[2 * plane + i] = data[p + 2]! / 255
  }
  return { ratio, dw, dh }
}

ctx.onmessage = async ({ data: { id, frame } }): Promise<void> => {
  try {
    const session = await sessionPromise
    const started = performance.now()
    const { ratio, dw, dh } = preprocess(frame)
    const out = await session.run({ images: new ort.Tensor('float32', input, [1, 3, SIZE, SIZE]) })
    const rows = out.output0!.data as Float32Array

    const boxes: PlateBox[] = []
    for (let o = 0; o + ROW <= rows.length; o += ROW) {
      const score = rows[o + 6]!
      if (score < DETECTOR_MIN_SCORE) continue
      boxes.push({
        x1: Math.max(0, (rows[o + 1]! - dw) / ratio),
        y1: Math.max(0, (rows[o + 2]! - dh) / ratio),
        x2: Math.min(frame.width, (rows[o + 3]! - dw) / ratio),
        y2: Math.min(frame.height, (rows[o + 4]! - dh) / ratio),
        score
      })
    }
    ctx.postMessage({ type: 'boxes', id, boxes, ms: performance.now() - started })
  } catch (err) {
    ctx.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  } finally {
    frame.close()
  }
}
