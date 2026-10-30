import { registryLabel } from '@carplates/shared'

import type { CompareRow, CompareValue } from './types'

type Translate = (key: string, options?: Record<string, unknown>) => string

export type FormatContext = {
  /** BCP-47 tag for digit grouping. */
  locale: string
  /** UI language (`ua` / `ru` / `en`): registry words are localized to it. */
  lang: string
  t: Translate
  regionLabel: (name: string) => string
}

/** What a missing value shows (a UI string never uses an em dash). */
export const GAP = '-'

/** A value as the table prints it, without its unit; `GAP` for a missing one. */
export function formatCompareValue(
  row: Pick<CompareRow, 'valueKind' | 'decimals'>,
  value: CompareValue,
  ctx: FormatContext
): string {
  if (value === null) return GAP
  switch (row.valueKind) {
    case 'number':
    case 'percent': {
      if (typeof value !== 'number') return String(value)
      const digits = row.decimals ?? 0
      const text = value.toLocaleString(ctx.locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })
      return row.valueKind === 'percent' ? `${text}%` : text
    }
    case 'bool':
      return value ? ctx.t('compare.yes') : GAP
    case 'fuel':
    case 'body':
    case 'color':
      return registryLabel(row.valueKind, String(value), ctx.lang)
    case 'region':
      return ctx.regionLabel(String(value))
    default:
      return String(value)
  }
}

/** The value with its unit ("147 kW"); a gap has none. */
export function formatWithUnit(
  row: Pick<CompareRow, 'valueKind' | 'decimals' | 'unitKey'>,
  value: CompareValue,
  ctx: FormatContext
): string {
  const text = formatCompareValue(row, value, ctx)
  return value !== null && row.unitKey ? `${text} ${ctx.t(row.unitKey)}` : text
}
