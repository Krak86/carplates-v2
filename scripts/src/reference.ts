/** Small deterministic PRNG (mulberry32) so `pnpm db:seed` is reproducible. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const pick = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length) % xs.length] as T

/** Cyrillic letters that actually appear on Ukrainian plates. */
export const PLATE_LETTERS = 'АВСЕНІКМОРТХ'

export const KINDS = ['ЛЕГКОВИЙ', 'ВАНТАЖНИЙ', 'АВТОБУС', 'МОТОЦИКЛ', 'ПРИЧІП'] as const
export const FUELS = ['БЕНЗИН', 'ДИЗЕЛЬНЕ ПАЛИВО', 'ГАЗ', 'ГАЗ/БЕНЗИН', 'ЕЛЕКТРО'] as const
export const COLORS = ['ЧОРНИЙ', 'БІЛИЙ', 'СІРИЙ', 'СИНІЙ', 'ЧЕРВОНИЙ', 'ЗЕЛЕНИЙ', 'ЖОВТИЙ'] as const
export const BODIES = ['СЕДАН', 'ХЕТЧБЕК', 'УНІВЕРСАЛ', 'КРОСОВЕР', 'МІНІВЕН'] as const
export const OPERS: ReadonlyArray<{ code: number; name: string }> = [
  { code: 100, name: 'ПЕРВИННА РЕЄСТРАЦIЯ' },
  { code: 300, name: 'ПЕРЕРЕЄСТРАЦIЯ У ЗВ`ЯЗКУ ЗІ ЗМІНОЮ ВЛАСНИКА' },
  { code: 390, name: 'ПЕРЕРЕЄСТРАЦIЯ У ЗВ`ЯЗКУ ЗI ЗМIНОЮ КОЛЬОРУ ТЗ' }
]

export const MODELS: ReadonlyArray<{ brand: string; model: string; kind: (typeof KINDS)[number] }> = [
  { brand: 'TOYOTA', model: 'CAMRY', kind: 'ЛЕГКОВИЙ' },
  { brand: 'TOYOTA', model: 'COROLLA', kind: 'ЛЕГКОВИЙ' },
  { brand: 'TOYOTA', model: 'RAV4', kind: 'ЛЕГКОВИЙ' },
  { brand: 'VOLKSWAGEN', model: 'GOLF', kind: 'ЛЕГКОВИЙ' },
  { brand: 'VOLKSWAGEN', model: 'PASSAT', kind: 'ЛЕГКОВИЙ' },
  { brand: 'VOLKSWAGEN', model: 'JETTA', kind: 'ЛЕГКОВИЙ' },
  { brand: 'SKODA', model: 'OCTAVIA', kind: 'ЛЕГКОВИЙ' },
  { brand: 'SKODA', model: 'FABIA', kind: 'ЛЕГКОВИЙ' },
  { brand: 'BMW', model: '320', kind: 'ЛЕГКОВИЙ' },
  { brand: 'BMW', model: 'X5', kind: 'ЛЕГКОВИЙ' },
  { brand: 'NISSAN', model: 'QASHQAI', kind: 'ЛЕГКОВИЙ' },
  { brand: 'NISSAN', model: 'LEAF', kind: 'ЛЕГКОВИЙ' },
  { brand: 'MERCEDES-BENZ', model: 'SPRINTER', kind: 'ВАНТАЖНИЙ' },
  { brand: 'BOGDAN', model: 'A092', kind: 'АВТОБУС' }
]

const VIN_ALPHABET = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'
export function makeVin(r: () => number): string {
  let s = ''
  for (let i = 0; i < 17; i++) s += VIN_ALPHABET[Math.floor(r() * VIN_ALPHABET.length)]
  return s
}
