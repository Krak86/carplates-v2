import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'

import CompareSlotHeader from '@/components/compare/CompareSlotHeader'
import CompareSlotPicker from '@/components/compare/CompareSlotPicker'
import CompareSectionHeading from '@/components/compare/CompareSectionHeading'
import { parseSection, sectionAnchor } from '@/components/compare/compare-share'
import CompareVisuals from '@/components/compare/CompareVisuals'
import CompareTable from '@/components/compare/CompareTable'
import { compareHref, formatCompareRef, parseCompareRef, sameRef } from '@/components/compare/ref'
import { carTitle } from '@/components/compare/resolve'
import { buildCompareRows, pruneRows } from '@/components/compare/rows'
import { COMPARE_GROUPS, COMPARE_SLOTS } from '@/components/compare/types'
import type { CompareGroup, CompareRef, CompareSlot } from '@/components/compare/types'
import { useCompareCar } from '@/components/compare/use-compare-car'
import type { CompareCarState } from '@/components/compare/use-compare-car'
import Card from '@/components/ui/Card'
import { scrollElementIntoView } from '@/lib/share-section'
import SectionSkeleton from '@/components/ui/SectionSkeleton'

const slotName = (state: CompareCarState, slot: CompareSlot): string => {
  const car = state.loaded.car
  const title = car ? [carTitle(car), car.year].filter(Boolean).join(' ') : ''
  return title || slot.toUpperCase()
}

function SlotCard({
  slot,
  refValue,
  state,
  onPick,
  onClear
}: {
  slot: CompareSlot
  refValue: CompareRef | null
  state: CompareCarState
  onPick: (ref: CompareRef) => void
  onClear: () => void
}): ReactNode {
  const { t } = useTranslation()
  const { loaded, error } = state

  return (
    <Card>
      <h2 className="sr-only">{t('compare.slot', { slot: slot.toUpperCase() })}</h2>
      {!refValue && <CompareSlotPicker slot={slot} onPick={onPick} />}
      {refValue && error && (
        <div role="alert">
          <p className="text-base">
            {t(error === 'notFound' ? 'compare.error.notFound' : 'result.error', { input: formatCompareRef(refValue) })}
          </p>
          <button type="button" onClick={onClear} className="mt-2 text-sm text-[var(--color-primary)] underline">
            {t('compare.change')}
          </button>
        </div>
      )}
      {refValue && !error && !loaded.car && <SectionSkeleton rows={3} />}
      {refValue && !error && loaded.car && <CompareSlotHeader slot={slot} loaded={loaded} onClear={onClear} />}
    </Card>
  )
}

// Lazy-loaded (see App.tsx). `/compare?a=plate:AA1234BB&b=m:bmw/3series/2015/diesel`: two cars, one mirrored table.
export default function CompareRoute(): ReactNode {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [diffOnly, setDiffOnly] = useState(params.get('diff') === '1')
  const scrolled = useRef(false)

  const refs: readonly [CompareRef | null, CompareRef | null] = [
    parseCompareRef(params.get('a')),
    parseCompareRef(params.get('b'))
  ]
  const states = [useCompareCar(refs[0]), useCompareCar(refs[1])] as const

  const go = (a: CompareRef | null, b: CompareRef | null): void => void navigate(compareHref(a, b))
  const handlePick =
    (slot: CompareSlot) =>
    (ref: CompareRef): void =>
      slot === 'a' ? go(ref, refs[1]) : go(refs[0], ref)
  const handleClear = (slot: CompareSlot) => (): void => (slot === 'a' ? go(null, refs[1]) : go(refs[0], null))
  const handleSwap = (): void => go(refs[1], refs[0])

  const ready = !!refs[0] && !!refs[1]
  const settled = Object.fromEntries(
    COMPARE_GROUPS.map(g => [g, states[0].settled[g] && states[1].settled[g]])
  ) as Record<CompareGroup, boolean>
  const { sections, hidden } = ready
    ? pruneRows(buildCompareRows(states[0].loaded, states[1].loaded, t, new Date().getFullYear()), settled)
    : { sections: [], hidden: 0 }
  const pending = sections.some(s => s.pending)
  const target = parseSection(params)

  useEffect(() => {
    // A section link scrolls to its block once the rows have settled (before that the page keeps growing).
    if (!target || !ready || pending || scrolled.current) return
    const el = document.getElementById(sectionAnchor(target))
    if (!el) return
    scrolled.current = true
    scrollElementIntoView(el)
  }, [target, ready, pending])

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4">
      <Card>
        <h1 className="mb-1 text-xl font-semibold">{t('compare.title')}</h1>
        <p className="text-base text-[var(--color-muted)]">{t('compare.intro')}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {COMPARE_SLOTS.map((slot, i) => (
          <SlotCard
            key={slot}
            slot={slot}
            refValue={refs[i] ?? null}
            state={states[i] as CompareCarState}
            onPick={handlePick(slot)}
            onClear={handleClear(slot)}
          />
        ))}
      </div>

      {!ready && <p className="text-base text-[var(--color-muted)]">{t('compare.pickBoth')}</p>}
      {ready && sameRef(refs[0], refs[1]) && (
        <p role="status" className="text-base text-[var(--color-muted)]">
          {t('compare.sameCar')}
        </p>
      )}

      {ready && (
        <Card>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSwap}
              className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              <span aria-hidden>⇄ </span>
              {t('compare.swap')}
            </button>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={diffOnly} onChange={e => setDiffOnly(e.target.checked)} />
              {t('compare.diffOnly')}
            </label>
          </div>

          {!pending && (
            <div className="mb-6">
              <CompareVisuals
                sections={sections}
                names={[slotName(states[0], 'a'), slotName(states[1], 'b')]}
                loaded={[states[0].loaded, states[1].loaded]}
              />
            </div>
          )}

          <CompareSectionHeading
            section="table"
            title={t('compare.table.title')}
            state={diffOnly ? { diff: '1' } : {}}
          />

          <CompareTable
            sections={sections}
            names={[slotName(states[0], 'a'), slotName(states[1], 'b')]}
            diffOnly={diffOnly}
          />

          {!pending && sections.length === 0 && (
            <p className="mt-3 text-base text-[var(--color-muted)]">{t('compare.nothing')}</p>
          )}
          {!pending && hidden > 0 && (
            <p className="mt-3 text-sm text-[var(--color-muted)]">{t('compare.hidden', { count: hidden })}</p>
          )}
          <p className="mt-3 text-sm text-[var(--color-muted)]">{t('compare.footnote')}</p>
        </Card>
      )}
    </main>
  )
}
