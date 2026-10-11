import type { Generation } from '@carplates/shared'
import { generationSpan } from '@carplates/shared'

type Translate = (key: string, options?: Record<string, unknown>) => string

/** The code when the source names one (`XV40`), else the ordinal label ("Second generation") translated. */
export function generationLabel(g: Pick<Generation, 'code' | 'label'>, t: Translate): string {
  if (g.code) return g.code
  const ordinal = /^(\w+) generation$/i.exec(g.label)?.[1]?.toLowerCase()
  return ordinal ? t(`generation.ordinal.${ordinal}`, { defaultValue: g.label }) : g.label
}

/** "Generation J200 · 2007–2021"; an ordinal label ("Second generation") already says it, so it gets no prefix. */
export function generationChipText(
  g: Pick<Generation, 'code' | 'label' | 'yearFrom' | 'yearTo'>,
  t: Translate
): string {
  const name = generationLabel(g, t)
  return `${g.code ? t('generation.chip', { name }) : name} · ${generationSpan(g)}`
}
