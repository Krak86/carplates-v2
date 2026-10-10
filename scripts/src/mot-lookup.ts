import { join } from 'node:path'

import { type MotGroupCode } from '@carplates/shared'

import { forEachCsvLine, openZipCsv } from './mot-zip.js'

/** DVSA top-level node name (lower-cased) → group code; the first matching rule wins, anything else is `other`. */
const GROUP_RULES: readonly (readonly [RegExp, MotGroupCode])[] = [
  [/brake/, 'brakes'],
  [/tyre/, 'tyres'],
  [/wheel/, 'wheels'],
  [/suspension/, 'suspension'],
  [/steering/, 'steering'],
  [/lamp|lighting|reflector/, 'lamps'],
  [/visibility|view of the road/, 'visibility'],
  [/body|structure/, 'body'],
  [/emission|exhaust|fuel/, 'exhaust'],
  [/seat ?belt/, 'seatbelts'],
  [/speedometer|speed limiter|driving controls/, 'speedometer'],
  [/identification|registration plates|reg plates/, 'identification'],
  [/towbar/, 'towbar']
]

export const groupCodeOf = (topName: string): MotGroupCode => {
  const n = topName.toLowerCase()
  return GROUP_RULES.find(([re]) => re.test(n))?.[1] ?? 'other'
}

export type MotReasonInfo = {
  rfrId: number
  group: MotGroupCode
  /** Leaf node name ("Brake disc"), the part the reason is about. */
  item: string
  /** Dangerous / Major / Minor / Pre-EU Directive. */
  category: string
  /** DVSA wording of the fault ("excessively corroded") and the milder advisory wording ("slightly corroded"). */
  desc: string
  advisory: string
}

type Node = { parent: string; name: string }

/**
 * `rfr_id` → group + wording from `lookup.zip`. The same `rfr_id` carries the same top-level group in every vehicle class
 * (checked on the 2023 lookup: 5,768 ids in 2+ classes, 0 differ), so the class is not needed to resolve a reason.
 */
export async function loadMotLookup(dir: string): Promise<Map<number, MotReasonInfo>> {
  const zip = join(dir, 'lookup.zip')
  const nodes = new Map<string, Node>()
  let ix: Record<string, number> = {}
  await forEachCsvLine(
    openZipCsv(zip, 'item_group'),
    h => {
      ix = Object.fromEntries(h.map((c, i) => [c, i]))
    },
    c => {
      nodes.set(`${c[ix.test_class_id!]}:${c[ix.test_item_id!]}`, {
        parent: c[ix.parent_id!]!,
        name: c[ix.item_name!]!.trim()
      })
    }
  )

  const top = (cls: string, item: string): string => {
    let name = ''
    let id = item
    for (let guard = 0; guard < 20; guard++) {
      const n = nodes.get(`${cls}:${id}`)
      if (!n) break
      name = n.name
      if (n.parent === '0') break
      id = n.parent
    }
    return name
  }

  const out = new Map<number, MotReasonInfo>()
  await forEachCsvLine(
    openZipCsv(zip, 'item_detail'),
    h => {
      ix = Object.fromEntries(h.map((c, i) => [c, i]))
    },
    c => {
      const rfrId = Number(c[ix.rfr_id!])
      const cls = c[ix.test_class_id!]!
      // Prefer the car row (class 4) for the wording; other classes only fill ids cars do not have.
      if (out.has(rfrId) && cls !== '4') return
      const item = c[ix.test_item_id!]!
      out.set(rfrId, {
        rfrId,
        group: groupCodeOf(top(cls, item)),
        item: nodes.get(`${cls}:${item}`)?.name ?? '',
        category: c[ix.rfr_deficiency_category!]!.trim(),
        desc: c[ix.rfr_desc!]!.trim(),
        advisory: c[ix.rfr_advisory_text!]!.trim()
      })
    }
  )
  return out
}

export type MotReasonDef = {
  code: string
  group: MotGroupCode
  item: string
  failText: string
  watchText: string
  dangerous: boolean
}

/** Dense lookup tables for the hot loop: `rfr_id` → reason index / group index / dangerous flag. */
export type MotReasonIndex = {
  reasons: MotReasonDef[]
  reasonOf: Int32Array
  groupOf: Int8Array
  dangerousOf: Uint8Array
}

const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)

/**
 * Merges `rfr_id`s into reason codes `group/item/fault` (the same fault has one id per class and the 2018 tree renumbered
 * items, so the id is not a stable key; the wording is). Severity comes from the lookup category, not `dangerous_mark`.
 */
export function buildReasonIndex(
  lookup: ReadonlyMap<number, MotReasonInfo>,
  groups: readonly string[]
): MotReasonIndex {
  const maxId = Math.max(...lookup.keys())
  const reasonOf = new Int32Array(maxId + 1).fill(-1)
  const groupOf = new Int8Array(maxId + 1).fill(-1)
  const dangerousOf = new Uint8Array(maxId + 1)
  const reasons: MotReasonDef[] = []
  const byCode = new Map<string, number>()
  for (const info of lookup.values()) {
    const code = `${info.group}/${slug(info.item)}/${slug(info.desc || info.advisory)}`
    let idx = byCode.get(code)
    if (idx === undefined) {
      idx = reasons.length
      byCode.set(code, idx)
      reasons.push({
        code,
        group: info.group,
        item: info.item,
        failText: info.desc,
        watchText: info.advisory,
        dangerous: info.category === 'Dangerous'
      })
    }
    reasonOf[info.rfrId] = idx
    groupOf[info.rfrId] = groups.indexOf(info.group)
    dangerousOf[info.rfrId] = info.category === 'Dangerous' ? 1 : 0
  }
  return { reasons, reasonOf, groupOf, dangerousOf }
}
