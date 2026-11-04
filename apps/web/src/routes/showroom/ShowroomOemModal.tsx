import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { ShowroomOemLink } from '@carplates/shared'

type Props = {
  label: string
  links: ShowroomOemLink[]
  onClose: () => void
}

/** Official manufacturer pages: link-outs only (configurators are not embeddable and we copy nothing of theirs). */
export default function ShowroomOemModal({ label, links, onClose }: Props): ReactNode {
  const { t } = useTranslation()

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal>
      <div className="max-h-full w-full max-w-xl overflow-y-auto rounded-xl bg-surface p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold">{t('showroom.oem.title', { label })}</div>
            <div className="text-sm text-muted">{t('showroom.oem.pick')}</div>
          </div>
          <button type="button" onClick={onClose} aria-label={t('model360.close')} className="text-muted hover:text-fg">
            ✕
          </button>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {links.map(link => (
            <li key={`${link.variant}|${link.url}`}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary hover:text-primary"
              >
                <span className="truncate">
                  {link.variant ? `${link.variant} · ` : ''}
                  {t(`showroom.oem.kind.${link.kind}`)}
                </span>
                <span className="shrink-0 text-muted">↗</span>
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-sm text-muted">{t('showroom.oem.note')}</p>
      </div>
    </div>,
    document.body
  )
}
