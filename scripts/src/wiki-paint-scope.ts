/** `--brand` / `--model` values of the paint scan: `wiki_image` keys are lower-cased, so match them the same way. */
export function normalizeScope(values: readonly string[]): string[] {
  return [...new Set(values.map(v => v.trim().toLowerCase()).filter(Boolean))]
}
