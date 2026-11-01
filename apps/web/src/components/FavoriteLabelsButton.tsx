import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useSession } from '@/components/auth/use-session'
import LabelChip from '@/components/LabelChip'
import { useFavoriteLabels } from '@/components/use-favorite-labels'
import { useFavoriteTagsActions } from '@/components/use-favorite-tags-actions'
import { cn } from '@/lib/cn'
import { labelColorVar, labelsOf } from '@/lib/favorite-labels'
import { favoriteId, type FavoriteKind } from '@/lib/favorites-db'
import { favoritesQuery } from '@/lib/queries'

/** Rough popover height (5 labels + manage link), used to decide whether to open upward. */
const POPOVER_MAX_HEIGHT = 260

type Position = { top: number; right: number; bottom?: never } | { bottom: number; right: number; top?: never }

type Props = {
  kind: FavoriteKind
  value: string
  className?: string
}

/**
 * Tag button next to a result card's star: shows which labels the favorite carries (tooltip) and opens a small
 * popover to tick labels on/off. Signed-in users with the item favorited only; labels are managed on /settings.
 */
export default function FavoriteLabelsButton({ kind, value, className }: Props): ReactNode {
  const { t } = useTranslation()
  const { user } = useSession()
  const labels = useFavoriteLabels()
  const favorites = useQuery(favoritesQuery())
  const { toggle } = useFavoriteTagsActions()
  const [pos, setPos] = useState<Position | null>(null)
  const open = pos !== null
  const rootRef = useRef<HTMLSpanElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const id = favoriteId(kind, value)
  const entry = favorites.data?.find(e => e.id === id)

  const toggleOpen = (): void => {
    if (open) return setPos(null)
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return
    const right = window.innerWidth - rect.right
    const flip = window.innerHeight - rect.bottom < POPOVER_MAX_HEIGHT && rect.top > POPOVER_MAX_HEIGHT
    setPos(flip ? { bottom: window.innerHeight - rect.top + 8, right } : { top: rect.bottom + 8, right })
  }

  useEffect(() => {
    if (!open) return
    const close = (): void => setPos(null)
    const handlePointerDown = (e: PointerEvent): void => {
      const target = e.target as Node
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) close()
    }
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    // The popover is fixed to the viewport, so any scroll/resize would detach it from the button.
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return (): void => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  // Anonymous visitors have no labels, and an un-favorited item has nothing to tag.
  if (!user || !entry) return null

  const applied = labelsOf(labels, entry.tags)
  const title = applied.length ? applied.map(l => l.name).join(', ') : t('favorites.labels.open')

  return (
    <span ref={rootRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('favorites.labels.open')}
        title={title}
        onClick={toggleOpen}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-6 w-6 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
          <circle cx="7.5" cy="7.5" r="1.5" />
        </svg>
        {applied.slice(0, 3).map(l => (
          <span
            key={l.id}
            aria-hidden
            className="h-3.5 w-3.5 shrink-0 rounded-full"
            style={{ backgroundColor: labelColorVar(l.color) }}
          />
        ))}
      </button>

      {pos &&
        // Portaled: result cards clip overflow, which cut the popover off.
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={t('favorites.labels.title')}
            style={pos}
            className="fixed z-50 max-h-[calc(100dvh-1rem)] w-56 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-sm shadow-xl"
          >
            {labels.length === 0 && <p className="p-1 text-[var(--color-muted)]">{t('favorites.labels.none')}</p>}

            <ul>
              {labels.map(label => (
                <li key={label.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-[var(--color-surface)]">
                    <input
                      type="checkbox"
                      checked={entry.tags?.includes(label.id) ?? false}
                      onChange={() => toggle({ id, labelId: label.id })}
                    />
                    <LabelChip label={label} className="border-0 px-0" />
                  </label>
                </li>
              ))}
            </ul>

            <Link
              to="/settings?tab=labels"
              className="mt-1 block border-t border-[var(--color-border)] px-1 pt-2 text-[var(--color-primary)] underline"
            >
              {t('favorites.labels.manage')}
            </Link>
          </div>,
          document.body
        )}
    </span>
  )
}
