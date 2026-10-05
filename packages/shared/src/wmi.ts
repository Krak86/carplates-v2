/**
 * Offline VIN-prefix (WMI) lookup — the fallback when NHTSA has no record for a VIN (typical for cars never
 * sold in the US/Canada). The first 3 VIN characters (World Manufacturer Identifier) name the maker and country
 * (ISO 3780); that is all this knows — no model, engine or trim. Curated for makes common in Ukraine, not exhaustive.
 */

/** Exact 3-character WMI → make + ISO 3166 country. */
const WMI: Readonly<Record<string, readonly [make: string, country: string]>> = {
  // South Korea
  KMH: ['Hyundai', 'KR'],
  KMF: ['Hyundai', 'KR'],
  KMC: ['Hyundai', 'KR'],
  KMJ: ['Hyundai', 'KR'],
  KNA: ['Kia', 'KR'],
  KNB: ['Kia', 'KR'],
  KNC: ['Kia', 'KR'],
  KND: ['Kia', 'KR'],
  KNE: ['Kia', 'KR'],
  KNM: ['Renault Korea', 'KR'],
  KPA: ['SsangYong', 'KR'],
  KPT: ['SsangYong', 'KR'],
  KL1: ['Chevrolet (GM Korea)', 'KR'],
  KLA: ['Daewoo', 'KR'],
  KLY: ['Daewoo', 'KR'],
  // Japan
  JTD: ['Toyota', 'JP'],
  JTE: ['Toyota', 'JP'],
  JTH: ['Lexus', 'JP'],
  JTJ: ['Lexus', 'JP'],
  JTK: ['Toyota', 'JP'],
  JTM: ['Toyota', 'JP'],
  JTN: ['Toyota', 'JP'],
  JT2: ['Toyota', 'JP'],
  JT3: ['Toyota', 'JP'],
  JT4: ['Toyota', 'JP'],
  JT6: ['Lexus', 'JP'],
  JT8: ['Lexus', 'JP'],
  JF1: ['Subaru', 'JP'],
  JF2: ['Subaru', 'JP'],
  JHM: ['Honda', 'JP'],
  JHL: ['Honda', 'JP'],
  JHG: ['Honda', 'JP'],
  JH4: ['Acura', 'JP'],
  JMZ: ['Mazda', 'JP'],
  JM1: ['Mazda', 'JP'],
  JM3: ['Mazda', 'JP'],
  JN1: ['Nissan', 'JP'],
  JN8: ['Nissan', 'JP'],
  JNK: ['Infiniti', 'JP'],
  JNR: ['Infiniti', 'JP'],
  JS1: ['Suzuki', 'JP'],
  JS2: ['Suzuki', 'JP'],
  JS3: ['Suzuki', 'JP'],
  JSA: ['Suzuki', 'JP'],
  JA3: ['Mitsubishi', 'JP'],
  JA4: ['Mitsubishi', 'JP'],
  JMB: ['Mitsubishi', 'JP'],
  JMY: ['Mitsubishi', 'JP'],
  JDA: ['Daihatsu', 'JP'],
  JKA: ['Kawasaki', 'JP'],
  JYA: ['Yamaha', 'JP'],
  // China
  LFV: ['Volkswagen (FAW-VW)', 'CN'],
  LSV: ['Volkswagen (SAIC-VW)', 'CN'],
  LSG: ['SAIC-GM (Buick / Chevrolet)', 'CN'],
  LZW: ['Wuling', 'CN'],
  LSJ: ['MG (SAIC)', 'CN'],
  LVS: ['Ford (Changan)', 'CN'],
  LVV: ['Chery', 'CN'],
  LGW: ['Great Wall', 'CN'],
  LB3: ['Geely', 'CN'],
  L6T: ['Geely', 'CN'],
  LDC: ['Dongfeng (Peugeot / Citroën)', 'CN'],
  LGB: ['Dongfeng Nissan', 'CN'],
  LJD: ['Kia (Dongfeng Yueda)', 'CN'],
  LBE: ['Hyundai (Beijing)', 'CN'],
  LVG: ['Toyota (GAC)', 'CN'],
  LHG: ['Honda (GAC)', 'CN'],
  LFP: ['FAW', 'CN'],
  LRW: ['Tesla (Shanghai)', 'CN'],
  LC0: ['BYD', 'CN'],
  LGX: ['BYD', 'CN'],
  // Germany
  WVW: ['Volkswagen', 'DE'],
  WVG: ['Volkswagen', 'DE'],
  WV1: ['Volkswagen Commercial', 'DE'],
  WV2: ['Volkswagen Commercial', 'DE'],
  WAU: ['Audi', 'DE'],
  WUA: ['Audi (quattro)', 'DE'],
  WBA: ['BMW', 'DE'],
  WBS: ['BMW M', 'DE'],
  WBY: ['BMW i', 'DE'],
  WMW: ['MINI', 'DE'],
  WDB: ['Mercedes-Benz', 'DE'],
  WDC: ['Mercedes-Benz', 'DE'],
  WDD: ['Mercedes-Benz', 'DE'],
  W1K: ['Mercedes-Benz', 'DE'],
  W1V: ['Mercedes-Benz Vans', 'DE'],
  WME: ['Smart', 'DE'],
  WP0: ['Porsche', 'DE'],
  WF0: ['Ford (Germany)', 'DE'],
  W0L: ['Opel', 'DE'],
  W0V: ['Opel', 'DE'],
  // France
  VF1: ['Renault', 'FR'],
  VF3: ['Peugeot', 'FR'],
  VF7: ['Citroën', 'FR'],
  VR1: ['DS', 'FR'],
  VNK: ['Toyota (France)', 'FR'],
  // Spain
  VSS: ['SEAT', 'ES'],
  VWV: ['Volkswagen (Spain)', 'ES'],
  VSK: ['Nissan (Spain)', 'ES'],
  VS6: ['Ford (Spain)', 'ES'],
  VS7: ['Citroën (Spain)', 'ES'],
  VSX: ['Opel (Spain)', 'ES'],
  // Italy
  ZFA: ['Fiat', 'IT'],
  ZFF: ['Ferrari', 'IT'],
  ZAR: ['Alfa Romeo', 'IT'],
  ZLA: ['Lancia', 'IT'],
  ZAM: ['Maserati', 'IT'],
  ZHW: ['Lamborghini', 'IT'],
  // Czechia / Slovakia / Hungary / Romania / Turkey
  TMB: ['Škoda', 'CZ'],
  TMA: ['Hyundai (Czechia)', 'CZ'],
  TRU: ['Audi (Hungary)', 'HU'],
  TSM: ['Suzuki (Hungary)', 'HU'],
  U5Y: ['Kia (Slovakia)', 'SK'],
  U6Y: ['Kia (Slovakia)', 'SK'],
  UU1: ['Dacia', 'RO'],
  UU6: ['Daewoo (Romania)', 'RO'],
  NMT: ['Toyota (Turkey)', 'TR'],
  NM0: ['Ford (Turkey)', 'TR'],
  // UK
  SAJ: ['Jaguar', 'GB'],
  SAL: ['Land Rover', 'GB'],
  SAR: ['Rover', 'GB'],
  SAH: ['Honda (UK)', 'GB'],
  SB1: ['Toyota (UK)', 'GB'],
  SJN: ['Nissan (UK)', 'GB'],
  SCC: ['Lotus', 'GB'],
  SCF: ['Aston Martin', 'GB'],
  // Sweden
  YV1: ['Volvo', 'SE'],
  YV4: ['Volvo', 'SE'],
  YS3: ['Saab', 'SE'],
  // Russia / Ukraine / Uzbekistan
  XTA: ['Lada (AvtoVAZ)', 'RU'],
  XW8: ['Volkswagen (Russia)', 'RU'],
  XUF: ['Chevrolet (Russia)', 'RU'],
  Y6D: ['ZAZ', 'UA'],
  XWB: ['UzAuto (Daewoo)', 'UZ'],
  // Thailand
  MNC: ['Ford (Thailand)', 'TH'],
  MNB: ['Ford (Thailand)', 'TH'],
  MPB: ['Ford (Thailand)', 'TH'],
  MMB: ['Mitsubishi (Thailand)', 'TH'],
  MMM: ['Chevrolet (Thailand)', 'TH'],
  MNT: ['Nissan (Thailand)', 'TH'],
  MR0: ['Toyota (Thailand)', 'TH'],
  MRH: ['Honda (Thailand)', 'TH'],
  MM8: ['Mazda (Thailand)', 'TH'],
  // India / Brazil / South Africa
  MA1: ['Mahindra', 'IN'],
  MA3: ['Maruti Suzuki', 'IN'],
  MAL: ['Hyundai (India)', 'IN'],
  MAT: ['Tata', 'IN'],
  '9BW': ['Volkswagen (Brazil)', 'BR'],
  AAV: ['Volkswagen (South Africa)', 'ZA'],
  // North America
  '1G1': ['Chevrolet', 'US'],
  '1GC': ['Chevrolet', 'US'],
  '1FA': ['Ford', 'US'],
  '1FT': ['Ford', 'US'],
  '1HG': ['Honda', 'US'],
  '1VW': ['Volkswagen', 'US'],
  '1N4': ['Nissan', 'US'],
  '2HG': ['Honda (Canada)', 'CA'],
  '3VW': ['Volkswagen (Mexico)', 'MX'],
  '3N1': ['Nissan (Mexico)', 'MX'],
  '3FA': ['Ford (Mexico)', 'MX'],
  '5YJ': ['Tesla', 'US'],
  '7SA': ['Tesla', 'US'],
  '5NP': ['Hyundai (US)', 'US'],
  '5XY': ['Kia (US)', 'US']
}

/** Country from the first 1–2 VIN characters (ISO 3780 blocks), for a WMI the table above doesn't list. */
const COUNTRY_BY_PREFIX: Readonly<Record<string, string>> = {
  '1': 'US',
  '4': 'US',
  '5': 'US',
  '2': 'CA',
  '3': 'MX',
  '9': 'BR',
  J: 'JP',
  K: 'KR',
  L: 'CN',
  W: 'DE',
  VF: 'FR',
  VS: 'ES',
  VA: 'AT',
  S: 'GB',
  YV: 'SE',
  YS: 'SE',
  Y6: 'UA',
  XT: 'RU',
  XU: 'RU',
  XW: 'RU',
  Z: 'IT',
  TM: 'CZ',
  TR: 'HU',
  TS: 'HU',
  UU: 'RO',
  MA: 'IN',
  MB: 'IN',
  ML: 'TH',
  MM: 'TH',
  MN: 'TH',
  MP: 'TH',
  MQ: 'TH',
  MR: 'TH',
  NM: 'TR'
}

export type WmiMatch = {
  /** null when only the country could be read off the first characters. */
  make: string | null
  /** ISO 3166-1 alpha-2. */
  country: string
}

/** Make + country from the VIN's first characters; null when even the country block is unknown. */
export function lookupWmi(vin: string): WmiMatch | null {
  const v = vin.trim().toUpperCase()
  const hit = WMI[v.slice(0, 3)]
  if (hit) return { make: hit[0], country: hit[1] }

  const country = COUNTRY_BY_PREFIX[v.slice(0, 2)] ?? COUNTRY_BY_PREFIX[v.slice(0, 1)]
  return country ? { make: null, country } : null
}

/** Whether the VIN's 3-character WMI is one this table lists (a country-block match alone doesn't count). */
export function hasKnownWmi(vin: string): boolean {
  return vin.slice(0, 3).toUpperCase() in WMI
}
