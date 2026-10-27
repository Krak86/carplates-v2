import type { ReactNode } from 'react'

import { isLegacyCountry } from '@carplates/shared'

import LegacyFlag from '@/components/LegacyFlag'
import { flagSlug } from '@/components/vin/helpers'

type Props = {
  /** ISO 3166-1 alpha-2, or a former state (`SU`, `CSHH`, `DD`, `YU`, `CSXX`, `DE-FRG`). No flag file renders nothing. */
  code: string
  /** Accessible name. Omit it when the country's name is printed next to the flag (the flag is then decorative). */
  label?: string
  className?: string
}

/**
 * Country flag as SVG. Emoji flags are drawn as the letters "DE" on Windows and do not exist for former states, so current
 * countries use the files in `public/country-flags/` (lazy `<img>`, runtime-cached) and former ones are drawn by `LegacyFlag`.
 */
export default function Flag({ code, label, className = 'h-3.5 w-5' }: Props): ReactNode {
  const a11y = label ? ({ role: 'img', 'aria-label': label } as const) : ({ 'aria-hidden': true } as const)

  if (isLegacyCountry(code) && code !== 'DE-FRG') {
    return (
      <span className="inline-flex" {...a11y}>
        <LegacyFlag code={code} className={className} />
      </span>
    )
  }

  const slug = flagSlug(code)
  if (!slug) return null

  return (
    <img
      src={`/country-flags/${slug}.svg`}
      alt={label ?? ''}
      loading="lazy"
      decoding="async"
      className={`inline-block shrink-0 rounded-xs object-cover align-[-2px] ${className}`}
    />
  )
}
