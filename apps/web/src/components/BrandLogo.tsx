import { useState } from 'react'
import type { ReactNode } from 'react'
import { brandLogoUrl } from '@carplates/shared'

import { cn } from '@/lib/cn'

type Props = {
  brand: string | null
  variant?: 'inline' | 'watermark'
  /** `inline` only — `sm` fits a fixed-width slot (leaderboard rows) so mixed logo aspect ratios don't misalign the text next to them. */
  size?: 'default' | 'sm'
  /** `inline` + `sm` only — keep the logo's slot as a dummy rectangle when there is no logo, so rows stay aligned. */
  placeholder?: boolean
  className?: string
}

/**
 * Renders nothing (or, with `placeholder`, a dummy rectangle) when the brand has no bundled logo (unknown/unmatched)
 * or the image fails to load — a broken-image icon would be worse than no logo at all.
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
export default function BrandLogo({
  brand,
  variant = 'inline',
  size = 'default',
  placeholder,
  className
}: Props): ReactNode {
  const [failed, setFailed] = useState(false)
  const src = brandLogoUrl(brand)

  if (!src || failed) {
    return placeholder && variant === 'inline' && size === 'sm' ? (
      <span aria-hidden className="inline-block h-4 w-5 shrink-0 rounded-sm bg-border/60" />
    ) : null
  }

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
          // Multiply would darken an already-dark surface to nothing. Invert flips the PNG's flat
          // white background to black (which `screen` then drops out) and its dark/colored
          // artwork to light; grayscale keeps the inverted hues from turning garish. Don't add
          // `brightness-0` — it blackens the background too, so the whole rectangle glows.
          'dark:mix-blend-screen dark:grayscale dark:invert',
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
      className={cn(
        // `cn` doesn't dedupe (plain clsx, no tailwind-merge) — the two sizes must never
        // both contribute a height/width class, or which one wins is cascade-order luck.
        size === 'sm' ? 'h-4 w-5' : 'h-4 w-auto max-w-15 shrink-0',
        'object-contain mix-blend-multiply',
        // Dark logos vanish on a dark surface — sit them on an opaque white chip (a translucent one
        // leaves dark-blue marks like Ford's low-contrast, and washes out the logos' own white backdrop).
        'dark:rounded dark:bg-white dark:mix-blend-normal',
        size === 'sm' ? 'dark:p-px' : 'dark:p-1',
        className
      )}
    />
  )
}
