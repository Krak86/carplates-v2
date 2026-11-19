import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { SEARCH_BUTTON_CLASS, SEARCH_BUTTON_ICON_CLASS } from '@/components/search-button-styles'

const BUTTONS = [
  { icon: '📷', label: 'search.byImage' },
  { icon: '🎥', label: 'search.byCamera' },
  { icon: '🔍', label: 'search.byAr' },
  { icon: '🔖', label: 'search.byVin' }
] as const

/**
 * The photo / camera / AR / VIN-photo row as inert shells (same classes, icons and labels as the real buttons), shown until
 * the lazy `SearchButtons` chunk is ready: the row is the same size from the first paint, so nothing moves when they swap in.
 */
export default function SearchButtonsPlaceholder(): ReactNode {
  const { t } = useTranslation()
  return (
    <>
      {BUTTONS.map(b => (
        <button key={b.label} type="button" disabled aria-hidden tabIndex={-1} className={SEARCH_BUTTON_CLASS}>
          <span aria-hidden className={SEARCH_BUTTON_ICON_CLASS}>
            {b.icon}
          </span>
          {t(b.label)}
        </button>
      ))}
    </>
  )
}
