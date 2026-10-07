/** Registry brands are upper-case ("TOYOTA", sometimes "HYUNDAI  TUCSON"): the bare brand name, upper-cased. */
export function upperBrand(brand: string): string {
  return (brand.split('  ')[0] ?? brand).trim().toUpperCase()
}

/** Title-case all but short acronyms (BMW, MG, KIA). */
export function displayBrand(brand: string): string {
  const name = upperBrand(brand)
  if (name.length <= 3) return name
  return name.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}
