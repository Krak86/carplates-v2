import type { ReactNode } from 'react'

/**
 * Placeholder for the hero photo and its thumbnail strip while the plate/VIN request is still in flight (the hero needs the
 * brand and model from it). Two siblings, exactly like `WikiHeroImage` renders them (`h-64 sm:h-80` hero with `-my-3`, then the
 * `mt-4` strip of `h-12 w-16` thumbnails): the parent's flex gap acts on them the same way, and the swap moves nothing.
 * Keep the classes in step with `WikiHeroImage`.
 */
export default function HeroSkeleton(): ReactNode {
  return (
    <>
      <div
        aria-hidden
        className="relative -my-3 h-64 w-full max-w-content animate-pulse rounded-lg border border-border bg-surface/70 sm:h-80"
      />
      <ul aria-hidden className="mt-4 flex w-full max-w-content gap-1.5 overflow-x-auto pb-1">
        {[0, 1, 2].map(n => (
          <li key={n} className="shrink-0">
            <div className="h-12 w-16 animate-pulse rounded-md border-2 border-transparent bg-border" />
          </li>
        ))}
      </ul>
    </>
  )
}
