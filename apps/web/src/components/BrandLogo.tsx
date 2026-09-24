import { useState } from 'react'
import type { ReactNode } from 'react'
import { brandLogoUrl } from '@carplates/shared'

import { cn } from '@/lib/cn'

type Props = {
  brand: string | null
  variant?: 'inline' | 'watermark'
  className?: string
}

/**
 * Renders nothing when the brand has no bundled logo (unknown/unmatched) or the image fails
 * to load — a broken-image icon would be worse than no logo at all.
 *
 * `mix-blend-mode: multiply` drops the source PNGs' flat white background against this
 * app's light card surface without needing pre-processed transparent assets.
 *
 * `watermark` spans the card's full width as a faint backdrop pinned to its top edge,
 * `h-auto` keeping the logo's own aspect ratio (no crop, no stretch) — unlike `inline`,
 * which is height-constrained to sit next to text. It breathes with a slow, continuous
 * zoom (`animate-watermark-breathe`) rather than a one-shot entrance, since it's a
 * permanent decorative backdrop, not a transient UI element. Its opacity and the zoom's
 * duration are tuned via `--watermark-opacity` and the `animate-watermark-breathe`
 * animation-duration in global.css, not here — keep them there so they stay one edit
 * away from each other while tuning. Callers must give the positioning ancestor
 * `relative isolate overflow-hidden` so the negative z-index keeps it under in-flow
 * content and the card's rounded corners/bottom edge clip whatever overflows.
 */
export default function BrandLogo({ brand, variant = 'inline', className }: Props): ReactNode {
  const [failed, setFailed] = useState(false)
  const src = brandLogoUrl(brand)

  if (!src || failed) return null

  if (variant === 'watermark') {
    return (
      <img
        src={src}
        alt=""
        aria-hidden
        onError={() => setFailed(true)}
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 -z-10 h-auto w-full animate-watermark-breathe object-contain',
          'opacity-(--watermark-opacity) mix-blend-multiply grayscale-[0.4]',
          className
        )}
      />
    )
  }

  return (
    <img
      src={src}
      alt={brand ?? ''}
      onError={() => setFailed(true)}
      className={cn('h-8 w-auto object-contain mix-blend-multiply', className)}
    />
  )
}
