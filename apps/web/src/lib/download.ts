/** Triggers a browser "Save As" for an in-memory Blob — no server round-trip. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function downloadText(content: string, filename: string, mime: string): void {
  downloadBlob(new Blob([content], { type: mime }), filename)
}

/** Filesystem-safe stem for an export filename — a plate/VIN never contains a real reserved character, but never trust that. */
export function toFileStem(value: string): string {
  return value.replace(/[^\p{L}\p{N}_-]+/gu, '_')
}

type VehicleFileParts = {
  brand: string | null
  model: string | null
  year: number | null
  plate: string | null
  vin: string | null
}

/** Local time as `YYYYMMDDHHmmss`, e.g. 20260915101823. */
function compactTimestamp(now: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

/** `brand_model_year_plate_vin_YYYYMMDDHHmmss` — missing parts are skipped; the stamp is when the export was taken. */
export function vehicleFileStem({ brand, model, year, plate, vin }: VehicleFileParts, now = new Date()): string {
  const date = compactTimestamp(now)
  const parts = [brand, model, year, plate, vin, date].filter(part => part != null && part !== '').map(String)
  return toFileStem(parts.join('_'))
}
