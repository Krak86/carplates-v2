// Message contract between the main thread and plate-detector.worker.ts.

/** A detected plate, in the pixel space of the frame that was sent. */
export type PlateBox = {
  x1: number
  y1: number
  x2: number
  y2: number
  score: number
}

export type DetectorRequest = { id: number; frame: ImageBitmap }

export type DetectorResponse =
  { type: 'ready' } | { type: 'error'; message: string } | { type: 'boxes'; id: number; boxes: PlateBox[]; ms: number }

export const DETECTOR_MODEL_URL = '/models/plate-detector.onnx'
export const DETECTOR_INPUT_SIZE = 384
export const DETECTOR_MIN_SCORE = 0.5
