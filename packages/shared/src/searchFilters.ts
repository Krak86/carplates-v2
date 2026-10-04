/**
 * Advanced-search free-text floors, shared by the web form and the API so they can't drift.
 *
 * Measured on the real registry (16.7M rows): real makes can be 2 chars (MG, DS, VD) and real models
 * 1-2 chars (Audi A6/A4/Q7, BMW X5/X3, Mazda 3/6 -- ~1.1M plates), so a flat 3-char floor hid them. But
 * pg_trgm's GIN index (migrations 0013/0014) only accelerates an ILIKE '%…%' with >= 3 chars, so a short
 * make/model is allowed only when the other field carries an indexable (>= 3 char) pattern.
 */
export const MIN_BRAND_LENGTH = 2
export const MIN_MODEL_LENGTH = 1
export const MIN_INDEXABLE_LENGTH = 3

export type TextFilterError = 'brandTooShort' | 'needsIndexable'

/** `null` when the (trimmed) make/model pair is searchable; otherwise which rule it breaks. */
export function textFilterError(brand: string, model: string): TextFilterError | null {
  const b = brand.trim()
  const m = model.trim()
  if (b.length > 0 && b.length < MIN_BRAND_LENGTH) return 'brandTooShort'
  if ((b.length > 0 || m.length > 0) && b.length < MIN_INDEXABLE_LENGTH && m.length < MIN_INDEXABLE_LENGTH) {
    return 'needsIndexable'
  }
  return null
}
