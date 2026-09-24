/**
 * `registry.current_registration.brand` is raw, unnormalized text — often "BRAND  MODEL"
 * (a double-space separator; confirmed against the real ingest, e.g. "DAEWOO  LANOS",
 * "ВАЗ  21063") but sometimes just a multi-word brand name with a single space ("LAND
 * ROVER"). Splitting on 2+ spaces isolates the brand for both cases.
 *
 * Logo slugs match filenames under `apps/web/public/logos/`, sourced from the MIT-licensed
 * https://github.com/filippofilip95/car-logos-dataset (logos themselves remain trademarks
 * of their respective owners). That dataset has ~650 files total, but most are defunct
 * 1900s-1930s coachbuilders, boutique hypercar startups, or region-specific sub-brands with
 * effectively zero chance of appearing in a Ukrainian vehicle registry — and its own listing
 * is too large to fetch in one pass to begin with. This map instead covers every brand
 * actually worth having: the real ingest's highest-volume brands, plus every other
 * globally-recognized car, heavy-truck and bus manufacturer the dataset has a logo for.
 * It does not cover motorcycle-only marques (Yamaha, Kawasaki, Harley-Davidson, …) — the
 * source dataset is cars/trucks only and has no logos for those. Anything unmatched resolves
 * to `null`, and callers must render nothing rather than a broken image.
 */
const BRAND_SLUG_BY_NAME: Readonly<Record<string, string>> = {
  VOLKSWAGEN: 'volkswagen',
  RENAULT: 'renault',
  ВАЗ: 'lada',
  LADA: 'lada',
  'MERCEDES-BENZ': 'mercedes-benz',
  'MERCEDES BENZ': 'mercedes-benz',
  SKODA: 'skoda',
  ŠKODA: 'skoda',
  FORD: 'ford',
  TOYOTA: 'toyota',
  OPEL: 'opel',
  HYUNDAI: 'hyundai',
  BMW: 'bmw',
  NISSAN: 'nissan',
  AUDI: 'audi',
  KIA: 'kia',
  CHEVROLET: 'chevrolet',
  MAZDA: 'mazda',
  MITSUBISHI: 'mitsubishi',
  PEUGEOT: 'peugeot',
  DAEWOO: 'daewoo',
  HONDA: 'honda',
  ЗАЗ: 'zaz',
  'ЗАЗ-DAEWOO': 'zaz',
  CITROEN: 'citroen',
  'CITROËN': 'citroen',
  VOLVO: 'volvo',
  FIAT: 'fiat',
  DACIA: 'dacia',
  LEXUS: 'lexus',
  JEEP: 'jeep',
  ГАЗ: 'gaz',
  DAF: 'daf',
  MAN: 'man',
  SUZUKI: 'suzuki',
  SUBARU: 'subaru',
  TESLA: 'tesla',
  CHERY: 'chery',
  'LAND ROVER': 'land-rover',
  GEELY: 'geely',
  SEAT: 'seat',
  DODGE: 'dodge',
  INFINITI: 'infiniti',
  PORSCHE: 'porsche',
  КАМАЗ: 'kamaz',

  ABARTH: 'abarth',
  ACURA: 'acura',
  'ALFA ROMEO': 'alfa-romeo',
  'ALFA-ROMEO': 'alfa-romeo',
  'ASTON MARTIN': 'aston-martin',
  BENTLEY: 'bentley',
  BUGATTI: 'bugatti',
  BUICK: 'buick',
  BYD: 'byd',
  CADILLAC: 'cadillac',
  CHANGAN: 'changan',
  CHRYSLER: 'chrysler',
  CUPRA: 'cupra',
  DAIHATSU: 'daihatsu',
  DATSUN: 'datsun',
  DONGFENG: 'dongfeng',
  DS: 'ds',
  FERRARI: 'ferrari',
  FOTON: 'foton',
  GAC: 'gac',
  'GREAT WALL': 'great-wall',
  GREATWALL: 'great-wall',
  HAVAL: 'haval',
  HINO: 'hino',
  HONGQI: 'hongqi',
  ISUZU: 'isuzu',
  IVECO: 'iveco',
  JAGUAR: 'jaguar',
  JETOUR: 'jetour',
  KENWORTH: 'kenworth',
  KTM: 'ktm',
  LAMBORGHINI: 'lamborghini',
  LANCIA: 'lancia',
  LINCOLN: 'lincoln',
  MASERATI: 'maserati',
  MCLAREN: 'mclaren',
  'MC LAREN': 'mclaren',
  MG: 'mg',
  MINI: 'mini',
  NIO: 'nio',
  OMODA: 'omoda',
  PETERBILT: 'peterbilt',
  POLESTAR: 'polestar',
  RAM: 'ram',
  RIVIAN: 'rivian',
  'ROLLS-ROYCE': 'rolls-royce',
  'ROLLS ROYCE': 'rolls-royce',
  SAAB: 'saab',
  SCANIA: 'scania',
  SMART: 'smart',
  SSANGYONG: 'ssangyong',
  'SSANG YONG': 'ssangyong',
  TRIUMPH: 'triumph',
  UAZ: 'uaz',
  УАЗ: 'uaz',
  'WESTERN STAR': 'western-star',
  XPENG: 'xpeng'
}

/** Static logo path for a raw registry `brand` value, or `null` when none is bundled. */
export function brandLogoUrl(brand: string | null | undefined): string | null {
  if (!brand) return null
  const brandOnly = brand.trim().split(/\s{2,}/)[0]?.toUpperCase()
  const slug = brandOnly ? BRAND_SLUG_BY_NAME[brandOnly] : undefined
  return slug ? `/logos/${slug}.png` : null
}
