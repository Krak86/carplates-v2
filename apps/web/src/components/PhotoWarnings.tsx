import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { PhotoMeta } from '@carplates/shared'

import { cn } from '@/lib/cn'
import { REGISTRY_START_YEAR, isBeforeRegistry, photoAgeYears } from '@/lib/photo-meta'

type Props = {
  meta?: PhotoMeta | null
  maxDimension: number
  showAccuracy: boolean
  mode?: 'plate' | 'vin'
}

type Warning = { key: string; icon: string; text: string }

export default function PhotoWarnings({ meta, maxDimension, showAccuracy, mode = 'plate' }: Props): ReactNode {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const years = meta ? photoAgeYears(meta) : 0

  const warnings: Warning[] = []
  if (meta && isBeforeRegistry(meta)) {
    warnings.push({ key: 'preRegistry', icon: '🗄️', text: t('photo.meta.preRegistry', { year: REGISTRY_START_YEAR }) })
  }
  if (years >= 1) warnings.push({ key: 'old', icon: '⏳', text: t('photo.meta.old', { count: years }) })
  warnings.push({
    key: 'tips',
    icon: '💡',
    text: t(mode === 'vin' ? 'recognize.photoTipsVin' : 'recognize.photoTips', { max: maxDimension })
  })
  if (showAccuracy) warnings.push({ key: 'accuracy', icon: '⚠️', text: t('recognize.accuracyWarning') })

  const [first, ...rest] = warnings
  if (!first) return null
  const hasMore = rest.length > 0

  return (
    <div className="w-full max-w-content rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-sm font-medium text-amber-800 dark:text-amber-300">
      <div className="flex items-start gap-1.5">
        <span aria-hidden>{first.icon}</span>
        <span className="min-w-0 flex-1">{first.text}</span>
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded(open => !open)}
            aria-expanded={expanded}
            aria-controls="photo-warnings-more"
            aria-label={expanded ? t('search.lessWarnings') : t('search.moreWarnings')}
            title={expanded ? t('search.lessWarnings') : t('search.moreWarnings')}
            className="-my-0.5 -mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-amber-500/20"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className={cn(
                'h-4 w-4 transition-transform duration-300 motion-reduce:transition-none',
                expanded && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        )}
      </div>

      {hasMore && (
        <div
          id="photo-warnings-more"
          inert={!expanded}
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none',
            expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          )}
        >
          <ul className="flex min-h-0 list-none flex-col gap-1.5 overflow-hidden">
            {rest.map((w, i) => (
              <li key={w.key} className={cn('flex items-start gap-1.5', i === 0 && 'pt-1.5')}>
                <span aria-hidden>{w.icon}</span>
                {w.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
