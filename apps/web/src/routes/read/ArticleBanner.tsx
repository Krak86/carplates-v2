import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import type { ArticleMeta } from '@/routes/read/types'

type Props = {
  article: Pick<ArticleMeta, 'path' | 'icon' | 'hue'>
  /** `card`: greyed out until the parent `group` is hovered/focused/touched; `header`: full colour, the picture drifts with the pointer. */
  variant?: 'card' | 'header'
  className?: string
}

/** Cover of a guide: the generated picture (`public/read/<guide>`, built by `pnpm build:read-images`) over a wide-gamut oklch gradient (sRGB fallback first), with the guide's emoji on top. */
export default function ArticleBanner({ article, variant = 'card', className }: Props): ReactNode {
  const { hue, path } = article
  const guide = path.split('/').pop()
  const isHeader = variant === 'header'

  // Parallax: pointer position (-1..1) goes to CSS vars, the picture moves by transform only (no re-render).
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    const box = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--px', String(((e.clientX - box.left) / box.width) * 2 - 1))
    e.currentTarget.style.setProperty('--py', String(((e.clientY - box.top) / box.height) * 2 - 1))
  }
  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>): void => {
    e.currentTarget.style.setProperty('--px', '0')
    e.currentTarget.style.setProperty('--py', '0')
  }

  return (
    <div
      aria-hidden
      onPointerMove={isHeader ? handlePointerMove : undefined}
      onPointerLeave={isHeader ? handlePointerLeave : undefined}
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
          className={cn(
            'absolute inset-0 size-full object-cover will-change-transform',
            isHeader
              ? 'translate-x-[calc(var(--px,0)*-4%)] translate-y-[calc(var(--py,0)*-8%)] scale-[1.2] transition-transform duration-200 ease-out'
              : 'opacity-45 grayscale transition duration-500 ease-out group-hover:scale-110 group-hover:opacity-100 group-hover:grayscale-0 group-focus-visible:opacity-100 group-focus-visible:grayscale-0'
          )}
        />
      </picture>

      <span
        className={cn(
          'absolute inset-0 bg-black/25 transition-opacity duration-500',
          !isHeader && 'group-hover:opacity-0'
        )}
      />

      <span className="relative drop-shadow-lg">{article.icon}</span>
    </div>
  )
}
