/** The tabs of the /stats highest / lowest spec panel (passenger cars). */
export const SPEC_METRICS = ['power', 'displacement', 'height', 'length', 'fuelTank'] as const
export type SpecMetric = (typeof SPEC_METRICS)[number]

export const DEFAULT_SPEC_METRIC: SpecMetric = 'power'

/** The `registry.stats_spec.metric` value of each tab, and the unit its `min_val` / `max_val` are stored in. */
export const SPEC_METRIC_COLUMN: Readonly<Record<SpecMetric, { key: string; unit: 'kW' | 'cc' | 'mm' | 'l' }>> = {
  power: { key: 'power_kw', unit: 'kW' },
  displacement: { key: 'displacement_cc', unit: 'cc' },
  height: { key: 'height_mm', unit: 'mm' },
  length: { key: 'length_mm', unit: 'mm' },
  fuelTank: { key: 'fuel_tank_l', unit: 'l' }
}
