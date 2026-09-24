/**
 * Reference list for the "which brands does this cover" popover — NHTSA only
 * tests vehicles actually sold new in the US, so matching depends on the exact
 * make/model/year, not just brand. Not exhaustive; informational only, never
 * used to gate an actual API call.
 */
export const NHTSA_CURRENT_BRANDS = [
  'Acura',
  'Audi',
  'BMW',
  'Buick',
  'Cadillac',
  'Chevrolet',
  'Chrysler',
  'Dodge',
  'Ford',
  'Genesis',
  'GMC',
  'Honda',
  'Hyundai',
  'Infiniti',
  'Jaguar',
  'Jeep',
  'Kia',
  'Land Rover',
  'Lexus',
  'Lincoln',
  'Mazda',
  'Mercedes-Benz',
  'MINI',
  'Mitsubishi',
  'Nissan',
  'Porsche',
  'Ram',
  'Subaru',
  'Tesla',
  'Toyota',
  'Volkswagen',
  'Volvo'
] as const

/** Discontinued in the US, but older model years may still have a rating on file. */
export const NHTSA_DISCONTINUED_BRANDS = [
  'Daewoo',
  'Hummer',
  'Isuzu',
  'Mercury',
  'Oldsmobile',
  'Plymouth',
  'Pontiac',
  'Saab',
  'Saturn',
  'Scion',
  'Suzuki'
] as const

/** Common in Ukraine's fleet but never sold new in the US — no NHTSA rating will ever exist. */
export const NHTSA_UNCOVERED_EXAMPLE_BRANDS = [
  'Lada / ВАЗ',
  'ZAZ',
  'GAZ',
  'UAZ',
  'Moskvich',
  'Renault',
  'Peugeot',
  'Citroën',
  'Opel',
  'Škoda',
  'SEAT',
  'Dacia'
] as const
