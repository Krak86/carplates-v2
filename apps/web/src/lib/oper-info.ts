/** Operation codes with a dedicated explainer (`oper.code.<code>` in i18n); the rest fall back to their range's group. */
const KNOWN_OPER_CODES: ReadonlySet<number> = new Set([
  13, 17, 18, 20, 30, 40, 48, 49, 50, 69, 70, 71, 72, 80, 99, 100, 101, 105, 110, 140, 172, 210, 212, 213, 215, 218,
  221, 230, 250, 252, 254, 255, 256, 270, 284, 293, 307, 308, 309, 310, 313, 314, 315, 317, 319, 320, 321, 322, 329,
  330, 331, 340, 350, 360, 363, 390, 400, 402, 403, 404, 405, 408, 410, 412, 420, 429, 430, 431, 434, 440, 450, 520,
  530, 534, 535, 536, 537, 540, 550, 560, 570
])

/** i18n key of the plain-language explainer for a registry operation code (stable across years, unlike the free-text names). */
export function operInfoKey(code: number | null | undefined): string {
  if (code == null) return 'oper.group.other'
  if (KNOWN_OPER_CODES.has(code)) return `oper.code.${code}`
  if (code < 200) return 'oper.group.reg'
  if (code < 300) return 'oper.group.temp'
  if (code < 400) return 'oper.group.owner'
  if (code < 500) return 'oper.group.change'
  if (code < 600) return 'oper.group.off'
  return 'oper.group.other'
}

export const OPER_CATEGORIES = ['new', 'import', 'owner', 'modification', 'deregistered', 'noise'] as const
export type OperCategory = (typeof OPER_CATEGORIES)[number]

const NEW_CODES: ReadonlySet<number> = new Set([17, 20, 30, 69, 72, 99, 105])
const IMPORT_CODES: ReadonlySet<number> = new Set([70, 71, 100, 172, 221])
const OWNER_CODES: ReadonlySet<number> = new Set([40, 48, 49, 50, 80, 101, 110, 140, 218, 363])
const MODIFICATION_CODES: ReadonlySet<number> = new Set([390, 400, 402, 403, 404, 405, 408])

/**
 * What an operation means for the car's story: how it entered the registry (new / imported used), a change of
 * owner, a physical change to the car, or leaving the register. Everything else (temporary slips, "proper user",
 * certificate / plate replacement, owner-detail changes) is `noise` — same owner, same car.
 */
export function operCategory(code: number | null | undefined): OperCategory {
  if (code == null) return 'noise'
  if (NEW_CODES.has(code)) return 'new'
  if (IMPORT_CODES.has(code)) return 'import'
  if (OWNER_CODES.has(code) || (code >= 307 && code <= 339)) return 'owner'
  if (MODIFICATION_CODES.has(code)) return 'modification'
  // 293 only ends a temporary registration; 5xx are real exits from the register
  if (code >= 500 && code < 600) return 'deregistered'
  return 'noise'
}
