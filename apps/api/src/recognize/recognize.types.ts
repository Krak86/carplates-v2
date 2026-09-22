export type UploadedImage = { buffer: Buffer; mimetype: string; filename: string }

export interface PlateReaderResult {
  plate?: string
  score?: number
}

export interface PlateReaderResponse {
  results?: PlateReaderResult[]
}
