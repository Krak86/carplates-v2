import type { SpecMetric } from '@carplates/shared'

/** "1 998 mm (2.0 m)" style value: mm shown as is, kW with the horsepower beside it, tank in litres. */
export function formatSpecValue(
  metric: SpecMetric,
  value: number,
  format: Intl.NumberFormat,
  units: Record<string, string>
): string {
  const rounded = metric === 'fuelTank' ? Math.round(value * 10) / 10 : Math.round(value)
  const base = `${format.format(rounded)} ${units[metric]}`
  // 1 kW = 1.35962 PS (metric horsepower).
  return metric === 'power' ? `${base} (${format.format(Math.round(value * 1.35962))} ${units.hp})` : base
}
