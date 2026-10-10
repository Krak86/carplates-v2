/** Transport Canada's "affected system" labels (a fixed list of 19) → i18n slug (`ca.sys.<slug>`). */
const SYSTEM_SLUGS: Readonly<Record<string, string>> = {
  accessories: 'accessories',
  airbag: 'airbag',
  brakes: 'brakes',
  electrical: 'electrical',
  engine: 'engine',
  'fuel system': 'fuel',
  'heater and defroster': 'heater',
  'high voltage': 'highVoltage',
  label: 'label',
  'lights and instruments': 'lights',
  other: 'other',
  powertrain: 'powertrain',
  'seats and restraints': 'seats',
  steering: 'steering',
  structure: 'structure',
  suspension: 'suspension',
  tires: 'tires',
  'visual system': 'visual',
  wheels: 'wheels'
}

/** i18n key for a known Transport Canada system label; null for wording we have no translation for (the UI then shows the original). */
export const systemKey = (system: string): string | null => {
  const slug = SYSTEM_SLUGS[system.trim().toLowerCase()]
  return slug ? `ca.sys.${slug}` : null
}

/** Public detail page of a recall on Transport Canada's recalls database. */
export const caRecallUrl = (code: string): string =>
  `https://wwwapps.tc.gc.ca/Saf-Sec-Sur/7/VRDB-BDRV/search-recherche/detail.aspx?lang=eng&rn=${encodeURIComponent(code)}`
