import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { tuningLocaleFor, tuningUrl } from '@carplates/shared'
import type { ShowroomTuningPage } from '@carplates/shared'

import { tuningPageLabel } from '@/routes/showroom/helpers'

type Props = {
  label: string
  pages: ShowroomTuningPage[]
  onClose: () => void
}

/** 3DTuning cannot be embedded (their pages send `X-Frame-Options: deny`), so this lists one link-out per generation. */
export default function ShowroomTuningModal({ label, pages, onClose }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = tuningLocaleFor(i18n.language)

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal>
      <div className="max-h-full w-full max-w-xl overflow-y-auto rounded-xl bg-surface p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold">{t('showroom.tuning.title', { label })}</div>
            <div className="text-sm text-muted">{t('showroom.tuning.pick')}</div>
          </div>
          <button type="button" onClick={onClose} aria-label={t('model360.close')} className="text-muted hover:text-fg">
            ✕
          </button>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {pages.map(page => (
            <li key={page.path}>
              <a
                href={tuningUrl(page, locale)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary hover:text-primary"
              >
                <span className="truncate">{tuningPageLabel(page)}</span>
                <span className="shrink-0 text-muted">{page.startYear} ↗</span>
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-sm text-muted">{t('showroom.tuning.note')}</p>
      </div>
    </div>,
    document.body
  )
}
