import type { ReactNode } from 'react'

/**
 * Placeholder for the hero photo and its thumbnail strip while the plate/VIN request is still in flight (the hero needs the
 * brand and model from it). Same boxes as `WikiHeroImage` (`h-64 sm:h-80` hero, `-my-3`, `h-12 w-16` thumbnails): keep them in step.
 */
export default function HeroSkeleton(): ReactNode {
  return (
    <div aria-hidden className="w-full max-w-content">
      <div className="relative -my-3 h-64 w-full animate-pulse rounded-lg border border-border bg-surface/70 sm:h-80" />
      <ul className="mt-4 flex w-full gap-1.5 pb-1">
        {[0, 1, 2].map(n => (
          <li key={n} className="shrink-0">
            <div className="h-12 w-16 animate-pulse rounded-md border-2 border-transparent bg-border" />
          </li>
        ))}
      </ul>
    </div>
  )
}
