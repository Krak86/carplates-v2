type Translate = (key: string, options?: Record<string, unknown>) => string

export const ENGINE_POSITIONS = ['front', 'mid', 'rear'] as const
export type EnginePosition = (typeof ENGINE_POSITIONS)[number]

export const DRIVEN_WHEELS = ['fwd', 'rwd', 'awd'] as const
export type DrivenWheels = (typeof DRIVEN_WHEELS)[number]

export const GEARBOX_KINDS = ['manual', 'automatic', 'dct', 'cvt', 'amt', 'single'] as const
export type GearboxKind = (typeof GEARBOX_KINDS)[number]

export type DriveRow = {
  /** Stable React key. */
  key: string
  labelKey: string
  aboutKey: string
  value: string
}

const POSITION_PATTERNS: Record<EnginePosition, RegExp> = {
  front:
    /front[\s-]*(?:engine|motor)|\bf[fr4]\s+layout|переднемотор|двигун спереду|двигатель спереди|motor vpředu|프론트\s*엔진|フロントエンジン/,
  mid: /mid[\s-]*(?:engine|motor)|среднемотор|미드\s*엔진/,
  rear: /rear[\s-]*(?:engine|motor)|заднемотор|리어\s*엔진/
}

/** Order matters only for readability; a text may match several (a layout list for different versions). */
const WHEEL_PATTERNS: Record<DrivenWheels, RegExp> = {
  fwd: /front[\s-]*wheel|\bfwd\b|\bff\s+layout|전륜|передн[а-яё]*\s+привод|привод\s+передн|привід\s+передн|передній\s+привід|předních kol|前輪|traction\b/,
  rwd: /rear[\s-]*wheel|\brwd\b|\bfr\s+layout|후륜|задн[а-яё]*\s+привод|привод\s+задн|привід\s+задн|задній\s+привід|zadních kol|後輪|propulsion/,
  awd: /all[\s-]*wheel|four[\s-]*wheel|4[\s-]*wheel|\b4wd\b|\bawd\b|\bf4\s+layout|4[x×]4|quattro|4motion|xdrive|4matic|полный привод|повний привід|všech kol|4륜|사륜|四輪|四驅/
}

/** Drops "(…)" groups (years, trims, markets) and collapses whitespace. */
function stripBrackets(text: string): string {
  return text
    .replace(/\((dct|dsg|cvt|amt)\)/gi, ' $1 ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** Engine position(s) and driven wheels named in a layout or gearbox text; empty arrays when nothing is recognised. */
export function parseLayout(text: string | null | undefined): { positions: EnginePosition[]; wheels: DrivenWheels[] } {
  const s = stripBrackets(text ?? '')
  const wheels = DRIVEN_WHEELS.filter(w => WHEEL_PATTERNS[w].test(s))
  // "Front-engine, rear-wheel…" lists a position, but "Rear-wheel drive" alone says nothing about where the engine sits.
  let positions = ENGINE_POSITIONS.filter(p => POSITION_PATTERNS[p].test(s))
  if (positions.includes('mid')) positions = positions.filter(p => p !== 'front')
  return { positions, wheels }
}

const KIND_PATTERNS: [GearboxKind, RegExp][] = [
  ['single', /single[\s-]*speed|(?<![\d+/])\b1[\s-]*speed|one[\s-]*speed|планетар|reduction gear|1단/],
  ['dct', /\bdct\b|\bdsg\b|dual[\s-]*clutch|듀얼\s*클러치|двухсцепл|powershift|\bpdk\b|s[\s-]*tronic|\bedc\b/],
  ['cvt', /\bcvt\b|e-?cvt|вариатор|variator|무단|lineartronic|xtronic/],
  [
    'amt',
    /automated manual|automanual|semi-?automatic|sequentronic|\bsmg\b|selespeed|multi[\s-]*mode|робот|자동화\s*수동|easytronic/
  ],
  ['manual', /manual|механ|мкпп|수동|\bmt\b/],
  ['automatic', /automatic|автомат|акпп|자동|tiptronic|steptronic|g-tronic|\bat\b/]
]

const NUMBER_WORDS: Record<string, number> = {
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  двух: 2,
  трех: 3,
  трёх: 3,
  четырех: 4,
  четырёх: 4,
  пяти: 5,
  шести: 6,
  семи: 7,
  восьми: 8,
  девяти: 9,
  десяти: 10,
  двох: 2,
  трьох: 3,
  чотирьох: 4,
  "п'яти": 5
}

const GEAR_UNIT = String.raw`(?:[\s-]*(?:speed|step|ступ[а-яё]*|скор[а-яё]*|ст\.?|단|ступін[а-яё]*))`
const GEAR_NUMBER = new RegExp(String.raw`(\d+(?:\s*/\s*\d+)*)${GEAR_UNIT}`, 'g')
const GEAR_WORD = new RegExp(
  String.raw`(${Object.keys(NUMBER_WORDS).join('|')})[\s-]*(?:speed|ступ[а-яё]*|ступін[а-яё]*)`,
  'g'
)
const GEAR_GLUED = /(\d)\s*(?:акпп|мкпп)/g
const BOTH_BOXES = /мкпп\s*\/\s*акпп|акпп\s*\/\s*мкпп/
const OR_SPLIT = /\s+(?:or|или|або)\s+/

function kindOf(text: string): GearboxKind | null {
  return KIND_PATTERNS.find(([, re]) => re.test(text))?.[0] ?? null
}

function gearsOf(text: string): number[] {
  const out: number[] = []
  for (const m of text.matchAll(GEAR_NUMBER)) out.push(...(m[1] ?? '').split('/').map(Number))
  for (const m of text.matchAll(GEAR_WORD)) out.push(NUMBER_WORDS[m[1] ?? ''] ?? 0)
  for (const m of text.matchAll(GEAR_GLUED)) out.push(Number(m[1]))
  return out.filter(n => n >= 2 && n <= 12)
}

/** Splits "4 or 5-speed manual or 3-speed automatic" into one part per gearbox kind; kind-less parts join the next one. */
function splitByKind(segment: string): string[] {
  const parts: string[] = []
  let pending = ''
  for (const piece of segment.split(OR_SPLIT)) {
    const joined = pending ? `${pending} ${piece}` : piece
    if (kindOf(piece)) {
      parts.push(joined)
      pending = ''
    } else pending = joined
  }
  if (pending) parts.push(parts.length > 0 ? `${parts.pop()} ${pending}` : pending)
  return parts
}

/** Gearbox kinds in a transmission text with the gear counts offered for each (empty list = kind named, count unknown). */
export function parseGearboxes(text: string | null | undefined): Map<GearboxKind, number[]> {
  const out = new Map<GearboxKind, number[]>()
  for (const segment of stripBrackets(text ?? '').split(/[;,\n]/)) {
    for (const part of splitByKind(segment)) {
      const kind = kindOf(part)
      if (!kind) continue
      // "6 ст. МКПП/АКПП": one gear count shared by both boxes.
      const kinds: GearboxKind[] = BOTH_BOXES.test(part) ? ['manual', 'automatic'] : [kind]
      for (const k of kinds) {
        const gears = out.get(k) ?? []
        for (const g of gearsOf(part)) if (!gears.includes(g)) gears.push(g)
        out.set(k, gears)
      }
    }
  }
  return out
}

/** Source text that is a leftover of the infobox or a pointer, not a value ("See below", "type = manual …"). */
function isJunk(text: string): boolean {
  return / = /.test(text) || /^see below$/i.test(text.trim())
}

/**
 * The "Drive and gearbox" rows as key / value pairs: engine position, driven wheels, then one row per gearbox kind with
 * its gear counts. A text nothing could be read from keeps its own row with the source words, unless it is junk.
 */
export function driveRows(
  layout: string | null | undefined,
  transmission: string | null | undefined,
  t: Translate
): DriveRow[] {
  const rows: DriveRow[] = []

  // French and Russian tables put the drive into the gearbox field ("Traction et 4×4", "…АКПП, привод передний").
  const fromLayout = parseLayout(layout)
  const fromGearbox = parseLayout(transmission)
  const positions = [...new Set([...fromLayout.positions, ...fromGearbox.positions])]
  const wheels = [...new Set([...fromLayout.wheels, ...fromGearbox.wheels])]
  if (positions.length > 0) {
    rows.push({
      key: 'enginePosition',
      labelKey: 'wikispec.row.enginePosition',
      aboutKey: 'wikispec.about.enginePosition',
      value: ENGINE_POSITIONS.filter(p => positions.includes(p))
        .map(p => t(`wikispec.pos.${p}`))
        .join(', ')
    })
  }
  if (wheels.length > 0) {
    rows.push({
      key: 'drivenWheels',
      labelKey: 'wikispec.row.drivenWheels',
      aboutKey: 'wikispec.about.drivenWheels',
      value: DRIVEN_WHEELS.filter(w => wheels.includes(w))
        .map(w => t(`wikispec.wheels.${w}`))
        .join(', ')
    })
  }
  if (positions.length === 0 && wheels.length === 0 && layout && !isJunk(layout)) {
    rows.push({ key: 'layout', labelKey: 'wikispec.layout', aboutKey: 'wikispec.about.layout', value: layout })
  }

  const boxes = parseGearboxes(transmission)
  for (const kind of GEARBOX_KINDS) {
    const gears = boxes.get(kind)
    if (!gears) continue
    rows.push({
      key: kind,
      labelKey: `wikispec.gearbox.${kind}`,
      aboutKey: `wikispec.about.gearbox.${kind}`,
      value:
        gears.length > 0
          ? t('wikispec.gears', { gears: [...gears].sort((a, b) => a - b).join(' / ') })
          : t('wikispec.offered')
    })
  }
  if (boxes.size === 0 && transmission && !isJunk(transmission) && !(positions.length || wheels.length)) {
    rows.push({
      key: 'transmission',
      labelKey: 'wikispec.transmission',
      aboutKey: 'wikispec.about.transmission',
      value: transmission
    })
  }
  return rows
}
