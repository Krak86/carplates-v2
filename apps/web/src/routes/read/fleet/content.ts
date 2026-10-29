export const LAW_LINKS = {
  reg1388: 'https://zakon.rada.gov.ua/laws/show/1388-98-%D0%BF',
  koap: 'https://zakon.rada.gov.ua/laws/show/80731-10',
  police: 'https://zakon.rada.gov.ua/laws/show/580-19',
  fuelRegulation: 'https://zakon.rada.gov.ua/laws/show/927-2013-%D0%BF',
  fuelDirective: 'https://eur-lex.europa.eu/eli/dir/1998/70/oj',
  altFuelsDirective: 'https://eur-lex.europa.eu/eli/dir/2014/94/oj',
  afir: 'https://eur-lex.europa.eu/eli/reg/2023/1804/oj',
  euro7: 'https://eur-lex.europa.eu/eli/reg/2024/1257/oj',
  co2Cars: 'https://eur-lex.europa.eu/eli/reg/2023/851/oj'
} as const

export type LawId = keyof typeof LAW_LINKS

export type FactItem = { key: string; laws?: readonly LawId[] }

export const COLOR_FACTS: readonly FactItem[] = [
  { key: 'palette' },
  { key: 'shade' },
  { key: 'multi' },
  { key: 'chameleon' },
  { key: 'wrap' },
  { key: 'film' },
  { key: 'rules', laws: ['reg1388', 'koap', 'police'] },
  { key: 'data' }
]

export const FUEL_FACTS: readonly FactItem[] = [
  { key: 'trend' },
  { key: 'history' },
  { key: 'hybrids' },
  { key: 'gas' },
  { key: 'chargers' },
  { key: 'fuelQuality', laws: ['fuelRegulation', 'fuelDirective'] },
  { key: 'e10', laws: ['fuelRegulation'] },
  { key: 'labels', laws: ['altFuelsDirective'] },
  { key: 'euro', laws: ['euro7', 'co2Cars'] },
  { key: 'chargingLaw', laws: ['afir'] },
  { key: 'data' }
]
