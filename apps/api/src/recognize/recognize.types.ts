export type UploadedImage = { buffer: Buffer; mimetype: string; filename: string }

export interface PlateReaderResult {
  plate?: string
  score?: number
  /** Fractions (0-1) of the image; set by the self-hosted ALPR only. */
  box?: { x: number; y: number; w: number; h: number }
}

export interface PlateReaderResponse {
  results?: PlateReaderResult[]
}
