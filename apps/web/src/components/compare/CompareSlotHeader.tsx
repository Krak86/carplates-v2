import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import BrandLogo from '@/components/BrandLogo'
import { cn } from '@/lib/cn'
import { wikiImageQuery } from '@/lib/queries'

import { coverageOf } from './coverage'
import { carTitle } from './resolve'
import { COMPARE_SOURCES } from './types'
import type { CompareLoaded, CompareSlot } from './types'

type Props = {
  slot: CompareSlot
  loaded: CompareLoaded
  onClear: () => void
}

const SLOT_COLOR: Record<CompareSlot, string> = { a: 'var(--color-compare-a)', b: 'var(--color-compare-b)' }

/** What the slot was given, as a short label: the plate, the VIN or "typical car". */
function inputLabel(loaded: CompareLoaded, t: (key: string) => string): string {
  const ref = loaded.car?.ref
  if (ref?.kind === 'plate') return ref.plate
  if (ref?.kind === 'vin') return ref.vin
  return t('compare.typicalCar')
}

/** One car's head: photo, name, what was entered, the coverage strip (which sources matched) and a way to change it. */
export default function CompareSlotHeader({ slot, loaded, onClear }: Props): ReactNode {
  const { t } = useTranslation()
  const { car } = loaded
  const hasQuery = !!(car?.brand || car?.model)
  const photo = useQuery({
    ...wikiImageQuery(car?.brand ?? '', car?.model ?? '', car?.year ?? null),
    enabled: hasQuery
  }).data?.image
  if (!car) return null

  const coverage = coverageOf(loaded)
  const credit = [photo?.attribution?.author, photo?.attribution?.license].filter(Boolean).join(' · ')

  return (
    <div className="flex gap-3" style={{ borderTop: `4px solid ${SLOT_COLOR[slot]}` }}>
      <div className="min-w-0 flex-1 pt-2">
        <div className="flex items-center gap-2">
          <BrandLogo brand={car.brand} size="sm" placeholder />
          <h2 className="min-w-0 text-lg font-semibold break-words">
            {carTitle(car) || t('compare.unknownCar')}
            {car.year ? <span className="ml-1.5 font-normal text-[var(--color-muted)]">{car.year}</span> : null}
          </h2>
        </div>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{inputLabel(loaded, t)}</p>

        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t('compare.coverage.label')}>
          {COMPARE_SOURCES.map(source => (
            <li
              key={source}
              className={cn(
                'rounded-full border px-2 py-0.5 text-xs',
                coverage[source]
                  ? 'border-[var(--color-primary)] text-[var(--color-fg)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)] line-through'
              )}
            >
              <span className="sr-only">
                {t(coverage[source] ? 'compare.coverage.matched' : 'compare.coverage.missing')}:{' '}
              </span>
              {t(`compare.source.${source}`)}
            </li>
          ))}
        </ul>

        <button type="button" onClick={onClear} className="mt-2 text-sm text-[var(--color-primary)] underline">
          {t('compare.change')}
        </button>
      </div>

      {photo && (
        <figure className="m-0 w-28 shrink-0 self-start pt-2 sm:w-40">
          <img
            src={photo.url}
            alt={carTitle(car)}
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full rounded-md object-cover"
          />
          {credit && (
            <figcaption className="mt-0.5 truncate text-[10px] text-[var(--color-muted)]">{credit}</figcaption>
          )}
        </figure>
      )}
    </div>
  )
}
