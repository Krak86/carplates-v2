import { brandSlug } from './brandLogo.js'

/**
 * Current-generation models used to pick a "new <brand>" photo for the new-cars side widget: the widget looks up a
 * Wikimedia Commons photo of one of these for the current model year (hotlinked, cached in `registry.wiki_image`).
 * Spelled the way Commons file names spell them. Keyed by the `brandLogo.ts` slug; an empty list or a missing brand
 * just means the widget shows no photo — add models by hand, most popular first.
 */
const SHOWCASE_MODELS_BY_SLUG: Readonly<Record<string, readonly string[]>> = {
  toyota: ['RAV4', 'Camry', 'Corolla Cross', 'Land Cruiser', 'C-HR'],
  lexus: ['RX', 'NX', 'LBX', 'ES'],
  skoda: ['Octavia', 'Kodiaq', 'Superb', 'Kamiq', 'Elroq'],
  volkswagen: ['Tiguan', 'Golf', 'ID.4', 'Passat', 'Touareg'],
  hyundai: ['Tucson', 'Santa Fe', 'Kona', 'Ioniq 5', 'Bayon'],
  kia: ['Sportage', 'Sorento', 'EV6', 'Ceed', 'Picanto'],
  'mercedes-benz': ['GLC', 'E-Class', 'C-Class', 'GLE', 'CLA'],
  bmw: ['X5', '3 Series', 'X3', '5 Series', 'iX'],
  audi: ['Q5', 'A6', 'Q7', 'A4', 'Q3'],
  nissan: ['Qashqai', 'X-Trail', 'Juke', 'Leaf', 'Ariya'],
  mazda: ['CX-5', 'CX-60', 'Mazda3', 'CX-30', 'MX-5'],
  mitsubishi: ['Outlander', 'Eclipse Cross', 'ASX', 'L200'],
  honda: ['CR-V', 'Civic', 'HR-V', 'ZR-V'],
  suzuki: ['Vitara', 'Swift', 'Jimny', 'S-Cross'],
  chery: ['Tiggo 7', 'Tiggo 8', 'Omoda 5'],
  renault: ['Clio', 'Austral', 'Captur', 'Megane E-Tech'],
  dacia: ['Duster', 'Sandero', 'Jogger'],
  ford: ['Puma', 'Kuga', 'Ranger', 'Mustang'],
  opel: ['Astra', 'Corsa', 'Mokka', 'Grandland'],
  peugeot: ['3008', '2008', '208', '5008'],
  citroen: ['C3', 'C5 Aircross', 'C4', 'Berlingo'],
  volvo: ['XC60', 'XC90', 'EX30', 'XC40'],
  jeep: ['Wrangler', 'Compass', 'Avenger', 'Grand Cherokee'],
  subaru: ['Forester', 'Outback', 'Crosstrek'],
  seat: ['Leon', 'Ateca', 'Arona'],
  cupra: ['Formentor', 'Born', 'Leon'],
  porsche: ['Macan', 'Cayenne', '911', 'Taycan'],
  'land-rover': ['Defender', 'Range Rover Velar', 'Discovery Sport'],
  tesla: ['Model Y', 'Model 3'],
  byd: ['Seal', 'Atto 3', 'Dolphin'],
  mg: ['MG4', 'ZS', 'HS'],
  haval: ['Jolion', 'H6', 'Dargo'],
  mini: ['Cooper', 'Countryman'],
  fiat: ['500', 'Panda', 'Tipo'],
  bentley: ['Continental GT', 'Bentayga', 'Flying Spur'],
  daf: ['XF', 'XG', 'CF'],
  geely: ['Coolray', 'Monjaro', 'Emgrand'],
  'great-wall': ['Poer', 'Wingle 7'],
  infiniti: ['QX50', 'QX60', 'Q50'],
  jaguar: ['F-Pace', 'E-Pace', 'I-Pace'],
  jetour: ['X70', 'Dashing', 'X90']
}

/** Showcase models for a raw registry `brand` value (possibly empty), in the order they are listed above. */
export function showcaseModels(brand: string | null | undefined): readonly string[] {
  const slug = brandSlug(brand)
  return (slug ? SHOWCASE_MODELS_BY_SLUG[slug] : undefined) ?? []
}
