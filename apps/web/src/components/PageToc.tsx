import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Item = { id: string; label: string }
type Props = { items: readonly Item[] }

/** "On this page" list of in-page anchors; each `id` must match an element id (give it `scroll-mt-20`). */
export default function PageToc({ items }: Props): ReactNode {
  const { t } = useTranslation()
  return (
    <nav aria-label={t('toc.title')} className="rounded-lg bg-[var(--color-border)]/30 p-3 text-sm">
      <p className="text-xs font-medium text-[var(--color-muted)]">{t('toc.title')}</p>
      <ol className="mt-1 list-decimal space-y-0.5 pl-5">
        {items.map(item => (
          <li key={item.id}>
            <a href={`#${item.id}`} className="text-[var(--color-primary)] underline">
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
