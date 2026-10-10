// Mazda's own model names are "Mazda2"/"Mazda3"/"Mazda5"/"Mazda6" — NHTSA indexes
// them that way, but the Ukrainian registry (and a bare VIN decode) gives just the
// digit ("6"), so an exact match against NHTSA always misses without this.
const MAZDA_NUMERIC_MODELS = new Set(['2', '3', '5', '6'])

// Mercedes-Benz's registry model is a trim code ("E 200", "ML 350"), but NHTSA indexes
// by class ("E-CLASS", "ML-CLASS") — same root mismatch as Euro NCAP's, see
// euroncap.service.ts's brandCandidateKey, but NHTSA needs no legacy-rename table: it
// keeps the badge each model year actually shipped under (still "ML-CLASS" for the years
// that badge was current), which already matches the registry's own leading letters
// verbatim — just reformatted as "<LETTERS>-CLASS".
const MERCEDES_BENZ_MAKE = 'mercedes-benz'

/**
 * The registry's `model` is often a bare trim-less string ("6", not "Mazda6") or
 * has a trim suffix NHTSA doesn't carry ("3 MPS"). The exact value comes first —
 * cheap and correct for the common case — then a couple of normalized fallbacks
 * for the caller to try only when that comes back empty.
 */
export function nhtsaModelCandidates(make: string, model: string): string[] {
  const trimmed = model.trim()
  const firstToken = trimmed.split(/\s+/)[0] ?? trimmed
  const candidates = [trimmed]
  const normalizedMake = make.trim().toLowerCase()

  if (normalizedMake === 'mazda' && MAZDA_NUMERIC_MODELS.has(firstToken)) {
    candidates.push(`Mazda${firstToken}`)
  }
  // Only when there's an actual "<letters> <digits...>" split — a one-word model
  // ("SPRINTER", "VITO") has no class letters to extract, so leave it alone.
  if (normalizedMake === MERCEDES_BENZ_MAKE && firstToken !== trimmed) {
    candidates.push(`${firstToken.toUpperCase()}-CLASS`)
  }
  if (firstToken !== trimmed) candidates.push(firstToken)

  return [...new Set(candidates)]
}
