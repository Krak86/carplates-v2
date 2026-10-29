import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import type { ArticleMeta } from '@/routes/read/types'

type Props = {
  article: Pick<ArticleMeta, 'path' | 'icon' | 'hue'>
  className?: string
}

/** Cover of a guide: the generated picture (`public/read/<guide>`, built by `pnpm build:read-images`) over a wide-gamut oklch gradient (sRGB fallback first), with the guide's emoji on top. */
export default function ArticleBanner({ article, className }: Props): ReactNode {
  const { hue, path } = article
  const guide = path.split('/').pop()

  return (
    <div
      aria-hidden
      className={cn('relative flex items-center justify-center overflow-hidden text-6xl', className)}
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
      <picture>
        <source srcSet={`/read/${guide}.avif`} type="image/avif" />
        <img
          src={`/read/${guide}.webp`}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      </picture>

      <span className="absolute inset-0 bg-black/25" />

      <span className="relative drop-shadow-lg">{article.icon}</span>
    </div>
  )
}
