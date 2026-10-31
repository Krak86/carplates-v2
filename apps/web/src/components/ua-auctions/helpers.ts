/** Feed status (Ukrainian) -> i18n key suffix of `uaAuctions.status.*`; an unknown status is shown as published. */
export const LOT_STATUS_KEYS: Readonly<Record<string, string>> = {
  'Торги відбулися': 'held',
  'Торги не відбулися': 'notHeld',
  'Реєстрація учасників': 'registration',
  'Торги припинено': 'terminated',
  'Торги зупинено': 'suspended',
  'Складання акту': 'act',
  'Очікування сплати': 'payment'
}

/** Status of a lot still running (registration open): the card calls it "open", not "not sold". */
export const OPEN_STATUS = 'Реєстрація учасників'

export const formatUah = (value: number | null, locale: string): string | null =>
  value === null
    ? null
    : new Intl.NumberFormat(locale, { style: 'currency', currency: 'UAH', maximumFractionDigits: 0 }).format(value)

/** Sale price relative to the start price, e.g. +25 (sold 25 % above) or -30; null without both prices. */
export function priceDeltaPercent(start: number | null, sale: number | null): number | null {
  if (start === null || sale === null || start <= 0) return null
  return Math.round(((sale - start) / start) * 100)
}
