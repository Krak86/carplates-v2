import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SHOWROOM_VIEWS } from '@carplates/shared'
import type { ShowroomView } from '@carplates/shared'

import { cn } from '@/lib/cn'

type Props = {
  view: ShowroomView
  onChange: (view: ShowroomView) => void
}

const VIEW_ICON: Readonly<Record<ShowroomView, string>> = { grid: '▦', list: '☰', gallery: '🖼️' }

/** Layout switch, styled like the Exterior / Interior toggle of the 360 modal. */
export default function ShowroomViewToggle({ view, onChange }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div
      role="group"
      aria-label={t('showroom.view.label')}
      className="inline-flex rounded-full border border-border p-0.5"
    >
      {SHOWROOM_VIEWS.map(v => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={() => onChange(v)}
          className={cn(
            'flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors duration-200',
            view === v ? 'bg-primary text-white' : 'text-muted hover:text-fg'
          )}
        >
          <span aria-hidden>{VIEW_ICON[v]}</span>
          <span className="max-sm:sr-only">{t(`showroom.view.${v}`)}</span>
        </button>
      ))}
    </div>
  )
}
