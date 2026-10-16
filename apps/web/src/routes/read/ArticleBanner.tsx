import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import type { ArticleMeta } from '@/routes/read/types'

type Props = {
  article: Pick<ArticleMeta, 'icon' | 'hue'>
  className?: string
}

/** Cover image of a guide: a wide-gamut oklch gradient (sRGB fallback first) with the guide's emoji. */
export default function ArticleBanner({ article, className }: Props): ReactNode {
  const { hue } = article

  return (
    <div
      aria-hidden
      className={cn('flex items-center justify-center text-6xl', className)}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 70% 60%), hsl(${(hue + 40) % 360} 70% 40%))`
      }}
      ref={node => {
        // oklch is wide-gamut (P3) where supported; the hsl above is the fallback.
        if (node && CSS.supports('color', 'oklch(0.7 0.2 0)')) {
          node.style.background = `linear-gradient(135deg, oklch(0.72 0.19 ${hue}), oklch(0.5 0.17 ${(hue + 40) % 360}))`
        }
      }}
    >
      <span className="drop-shadow-lg">{article.icon}</span>
    </div>
  )
}
