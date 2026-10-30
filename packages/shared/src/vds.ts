/**
 * Model family from the VIN's 4th character, for makers whose European VINs NHTSA cannot decode. Only prefixes we are
 * sure of: a wrong model is worse than none, since the result feeds the RDW / catalog matchers. Grow it one verified
 * prefix at a time (check against a decoder that shows the model, never guess from the generation).
 */
const VDS_MODELS: Record<string, readonly [make: string, model: string]> = {
  // Kia Slovakia (Zilina): Cee'd JD hatchback / wagon / ProCeed, 2012-2018. Seen: U5YHN512BDL007162 = Kia Cee'd.
  U5YH: ['Kia', "Cee'd"]
}

export type VdsMatch = { make: string; model: string }

/** Make + model family from the first 4 VIN characters; null when the prefix isn't in the table. */
export function lookupVdsModel(vin: string): VdsMatch | null {
  const hit = VDS_MODELS[vin.trim().toUpperCase().slice(0, 4)]
  return hit ? { make: hit[0], model: hit[1] } : null
}
