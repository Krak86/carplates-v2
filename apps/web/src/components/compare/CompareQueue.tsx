import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'
import { useCompareTray } from '@/store/compare-tray-store'

import { formatCompareRef, sameRef } from './ref'
import { COMPARE_SLOTS } from './types'
import type { CompareRef, CompareSlot } from './types'

type Props = {
  /** What the two slots hold now. */
  refs: readonly [CompareRef | null, CompareRef | null]
  /** Puts a queued car into a slot (the other slot stays). */
  onAssign: (slot: CompareSlot, ref: CompareRef) => void
}

/** One hue per queued car (by position), so a chip is easy to tell apart; oklch with an sRGB fallback. */
const CAR_COLORS = [
  ['#e0457b', 'oklch(0.66 0.2 5)'],
  ['#3aa76d', 'oklch(0.7 0.17 150)'],
  ['#8b5cf6', 'oklch(0.62 0.2 295)'],
  ['#d99a00', 'oklch(0.76 0.16 80)'],
  ['#14a3b8', 'oklch(0.7 0.12 210)'],
  ['#e0602a', 'oklch(0.67 0.18 40)']
] as const

const WIDE_GAMUT = typeof CSS !== 'undefined' && CSS.supports('color', 'oklch(0.5 0.1 100)')

const SLOT_COLOR: Record<CompareSlot, string> = { a: 'var(--color-compare-a)', b: 'var(--color-compare-b)' }

/** The compare list: every car added with "Add to compare", each one a chip to put into slot A or B, or to remove. */
export default function CompareQueue({ refs, onAssign }: Props): ReactNode {
  const { t } = useTranslation()
  const items = useCompareTray(s => s.items)
  const remove = useCompareTray(s => s.remove)
  const clear = useCompareTray(s => s.clear)
  if (items.length === 0) return null

  return (
    <section aria-label={t('compare.queue.title')} className="rounded-xl border border-[var(--color-border)] p-3">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold">{t('compare.queue.title')}</h2>
        <p className="text-sm text-[var(--color-muted)]">{t('compare.queue.hint')}</p>
        <button type="button" onClick={clear} className="ml-auto text-sm text-[var(--color-primary)] underline">
          {t('compare.queue.clear')}
        </button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {items.map((item, index) => {
          const [fallback, wide] = CAR_COLORS[index % CAR_COLORS.length] ?? CAR_COLORS[0]
          const color = WIDE_GAMUT ? wide : fallback
          return (
            <li
              key={formatCompareRef(item.ref)}
              style={{ borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
              className="inline-flex items-center overflow-hidden rounded-full border text-sm"
            >
              <span className="px-2.5 py-0.5">{item.label}</span>
              {COMPARE_SLOTS.map((slot, i) => {
                const active = sameRef(refs[i] ?? null, item.ref)
                return (
                  <button
                    key={slot}
                    type="button"
                    aria-pressed={active}
                    disabled={active}
                    title={t(
                      active ? `compare.queue.in${slot.toUpperCase()}` : `compare.queue.to${slot.toUpperCase()}`,
                      {
                        name: item.label
                      }
                    )}
                    aria-label={t(
                      active ? `compare.queue.in${slot.toUpperCase()}` : `compare.queue.to${slot.toUpperCase()}`,
                      { name: item.label }
                    )}
                    onClick={() => onAssign(slot, item.ref)}
                    style={active ? { backgroundColor: SLOT_COLOR[slot], color: 'var(--color-bg)' } : undefined}
                    className={cn(
                      'border-l border-[var(--color-border)] px-2 py-0.5 font-semibold',
                      !active && 'hover:text-[var(--color-primary)]'
                    )}
                  >
                    {slot.toUpperCase()}
                  </button>
                )
              })}
              <button
                type="button"
                title={t('compare.tray.remove', { name: item.label })}
                aria-label={t('compare.tray.remove', { name: item.label })}
                onClick={() => remove(item.ref)}
                className="border-l border-[var(--color-border)] px-2 py-0.5 hover:text-[var(--color-primary)]"
              >
                <span aria-hidden>×</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
