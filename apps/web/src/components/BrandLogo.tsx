import { useState } from 'react'
import type { ReactNode } from 'react'
import { brandLogoUrl } from '@carplates/shared'

import { cn } from '@/lib/cn'

type Props = {
  brand: string | null
  className?: string
}

/**
 * Renders nothing when the brand has no bundled logo (unknown/unmatched) or the image fails
 * to load — a broken-image icon would be worse than no logo at all.
 *
 * `mix-blend-mode: multiply` drops the source PNGs' flat white background against this
 * app's light card surface without needing pre-processed transparent assets.
 */
export default function BrandLogo({ brand, className }: Props): ReactNode {
  const [failed, setFailed] = useState(false)
  const src = brandLogoUrl(brand)

  if (!src || failed) return null

  return (
    <img
      src={src}
      alt={brand ?? ''}
      onError={() => setFailed(true)}
      className={cn('h-8 w-auto object-contain [mix-blend-mode:multiply]', className)}
    />
  )
}
