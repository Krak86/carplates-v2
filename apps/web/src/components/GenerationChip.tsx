import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import { generationChipText, generationLabel, generationSpanText } from '@/components/GenerationChip.helpers'
import { generationQuery } from '@/lib/queries'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
}

const CHIP =
  'chip-market chip-tone inline-flex animate-chip-in items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-[var(--color-fg)]'

/**
 * "Generation XV40 · 2006–2011" chip from Wikidata / Wikipedia facts, with the neighbouring generations in its popover.
 * Renders nothing while loading, on error, without a match, for a one-generation model, or when the year falls in no known span.
 */
export default function GenerationChip({ brand, model, year }: Props): ReactNode {
  const { t } = useTranslation()
  const { data } = useQuery({
    ...generationQuery(brand ?? '', model ?? '', year ?? 0),
    enabled: !!(brand && model && year)
  })
  const match = data?.match
  const current = match?.current
  // A model with one row (VAZ-2109, Lanos) has no generations to tell apart: its row only anchors the spec sheet.
  if (!match || !current || match.total < 2) return null

  const name = generationLabel(current, t)
  const lines = [
    t('generation.info.lead', {
      name: `${match.makeName} ${match.modelName}`,
      generation: name,
      span: generationSpanText(current, t)
    }),
    match.boundary && t('generation.info.boundary'),
    match.previous &&
      t('generation.info.previous', {
        generation: generationLabel(match.previous, t),
        span: generationSpanText(match.previous, t)
      }),
    match.next &&
      t('generation.info.next', {
        generation: generationLabel(match.next, t),
        span: generationSpanText(match.next, t)
      }),
    current.bodyStyles && t('generation.info.body', { body: current.bodyStyles }),
    current.platform && t('generation.info.platform', { platform: current.platform }),
    t('generation.info.credit')
  ].filter(Boolean)

  return (
    <InfoPopover
      label={t('generation.info.title')}
      title={t('generation.info.title')}
      anchor={
        <span className={CHIP}>
          <span aria-hidden>🧬</span>
          {generationChipText(current, t)}
        </span>
      }
    >
      <ul className="list-disc space-y-1 pl-4">
        {lines.map(line => (
          <li key={String(line)}>{line}</li>
        ))}
      </ul>
    </InfoPopover>
  )
}
