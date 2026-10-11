import type { TFunction } from 'i18next'

import type { Generation } from '@carplates/shared'

/** The code when the source names one (`XV40`), else the ordinal label ("Second generation") translated. */
export function generationLabel(g: Pick<Generation, 'code' | 'label'>, t: TFunction): string {
  if (g.code) return g.code
  const ordinal = /^(\w+) generation$/i.exec(g.label)?.[1]?.toLowerCase()
  return ordinal ? t(`generation.ordinal.${ordinal}`, { defaultValue: g.label }) : g.label
}
