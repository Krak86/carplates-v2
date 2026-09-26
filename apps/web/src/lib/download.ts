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
