import { extractVins } from '@carplates/shared'

type DetectedBarcode = { rawValue: string }
type BarcodeDetectorLike = { detect: (image: ImageBitmapSource) => Promise<DetectedBarcode[]> }
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike

const FORMATS = ['code_128', 'code_39', 'data_matrix', 'qr_code']

/**
 * Door-jamb / registration-document VINs are often a barcode: reading it on-device is exact (no OCR
 * confusions) and free. `BarcodeDetector` is Chromium-only — elsewhere, and on any failure, this
 * returns null and the caller falls back to the server OCR.
 */
export async function readVinBarcode(file: File): Promise<string | null> {
  const Detector = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
  if (!Detector) return null
  try {
    const bitmap = await createImageBitmap(file)
    const codes = await new Detector({ formats: FORMATS }).detect(bitmap)
    bitmap.close()
    return extractVins(codes.map(c => ({ text: c.rawValue, score: 1 })))[0]?.vin ?? null
  } catch {
    return null
  }
}
